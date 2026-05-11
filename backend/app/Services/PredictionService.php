<?php
namespace App\Services;

use App\Models\Chambre;
use App\Models\Prediction;
use App\Models\Alerte;
use Illuminate\Support\Facades\Http;

class PredictionService
{
    private string $mlApiUrl;

    public function __construct()
    {
        $this->mlApiUrl = config('services.ml_api.url', 'http://localhost:5000');
    }

    public function genererPredictions(int $jours = 7, bool $entrainer = false): array
    {
        $totalChambres = Chambre::where('statut', '!=', 'maintenance')->count();

        if ($entrainer) {
            $this->entrainerModele($totalChambres);
        }

        $features = $this->preparerFeaturesEntree($jours);

        try {
            $response = Http::timeout(30)->post("{$this->mlApiUrl}/predict", [
                'features'       => $features,
                'total_chambres' => $totalChambres,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $this->sauvegarderPredictions($data['predictions'], $totalChambres);
            }
        } catch (\Exception $e) {
            \Log::warning("ML service indisponible : " . $e->getMessage());
        }

        return $this->predictionFallback($jours, $totalChambres);
    }

    public function entrainerModele(int $totalChambres = 0): array
    {
        if ($totalChambres === 0) {
            $totalChambres = Chambre::where('statut', '!=', 'maintenance')->count();
        }

        $reservations = \App\Models\Reservation::whereNotIn('statut', ['annulee'])
            ->select(['date_arrivee', 'date_depart', 'nombre_personnes', 'is_last_minute', 'prix_total'])
            ->get()
            ->toArray();

        if (count($reservations) < 10) {
            return [];
        }

        try {
            $response = Http::timeout(120)->post("{$this->mlApiUrl}/train", [
                'reservations'   => $reservations,
                'total_chambres' => $totalChambres,
            ]);

            if ($response->successful()) {
                return $response->json('metriques', []);
            }
        } catch (\Exception $e) {
            \Log::warning("Entraînement ML échoué : " . $e->getMessage());
        }

        return [];
    }

    private function preparerFeaturesEntree(int $jours): array
    {
        $historique = $this->getHistoriqueDailyCount(35);

        $features = [];
        for ($i = 0; $i < $jours; $i++) {
            $date    = now()->addDays($i);
            $dateStr = $date->toDateString();

            $features[] = [
                'annee'        => $date->year,
                'mois'         => $date->month,
                'jour'         => $date->day,
                'jour_semaine' => $date->dayOfWeek,
                'est_weekend'  => (int) $date->isWeekend(),
                'mois_sin'     => round(sin(2 * M_PI * $date->month / 12), 6),
                'mois_cos'     => round(cos(2 * M_PI * $date->month / 12), 6),
                'lag_7'        => $historique[$date->copy()->subDays(7)->toDateString()]  ?? null,
                'lag_14'       => $historique[$date->copy()->subDays(14)->toDateString()] ?? null,
                'lag_28'       => $historique[$date->copy()->subDays(28)->toDateString()] ?? null,
                'roll_7'       => $this->rollingMean($historique, $dateStr, 7),
                'roll_30'      => $this->rollingMean($historique, $dateStr, 30),
            ];
        }
        return $features;
    }

    private function getHistoriqueDailyCount(int $jours): array
    {
        $rows = \App\Models\Reservation::whereNotIn('statut', ['annulee'])
            ->where('date_arrivee', '>=', now()->subDays($jours + 30)->toDateString())
            ->where('date_arrivee', '<',  now()->toDateString())
            ->selectRaw('date_arrivee, COUNT(*) as nb')
            ->groupBy('date_arrivee')
            ->pluck('nb', 'date_arrivee')
            ->toArray();
        return $rows;
    }

    private function rollingMean(array $historique, string $date, int $fenetre): float
    {
        $total = 0;
        $count = 0;
        for ($d = 1; $d <= $fenetre; $d++) {
            $key = \Carbon\Carbon::parse($date)->subDays($d)->toDateString();
            if (isset($historique[$key])) {
                $total += $historique[$key];
                $count++;
            }
        }
        return $count > 0 ? round($total / $count, 4) : 2.0;
    }

    private function sauvegarderPredictions(array $predictions, int $totalChambres): array
    {
        $saved = [];
        foreach ($predictions as $pred) {
            $date   = $pred['date'];
            $niveau = $this->classerNiveauDemande($pred['taux_occupation']);

            $ancienne = Prediction::where('date_prediction', $date)->first();
            if ($ancienne) {
                Alerte::where('prediction_id', $ancienne->id)->delete();
                $ancienne->delete();
            }

            $prediction = Prediction::create([
                'date_prediction'        => $date,
                'nb_reservations_predit' => $pred['nb_reservations'],
                'nb_last_minute_predit'  => $pred['nb_last_minute'],
                'taux_occupation_predit' => $pred['taux_occupation'],
                'prix_recommande'        => $pred['prix_recommande'] ?? null,
                'niveau_demande'         => $niveau,
                'confiance'              => $pred['confiance'] ?? null,
            ]);

            $this->genererAlertes($prediction);
            $saved[] = $prediction;
        }
        return $saved;
    }

    private function classerNiveauDemande(float $tauxOccupation): string
    {
        return match(true) {
            $tauxOccupation >= 80 => 'forte',
            $tauxOccupation >= 40 => 'normale',
            default               => 'faible',
        };
    }

    private function genererAlertes(Prediction $prediction): void
    {
        if ($prediction->niveau_demande === 'forte') {
            Alerte::create([
                'prediction_id' => $prediction->id,
                'type'          => 'forte_demande',
                'message'       => "Forte demande prévue le {$prediction->date_prediction->format('d/m/Y')} "
                                 . "— Taux estimé : {$prediction->taux_occupation_predit}% "
                                 . "— Envisager une hausse tarifaire.",
            ]);
        } elseif ($prediction->niveau_demande === 'faible') {
            Alerte::create([
                'prediction_id' => $prediction->id,
                'type'          => 'faible_demande',
                'message'       => "Faible demande prévue le {$prediction->date_prediction->format('d/m/Y')} "
                                 . "— Taux estimé : {$prediction->taux_occupation_predit}% "
                                 . "— Envisager des promotions.",
            ]);
        }
    }

    private function predictionFallback(int $jours, int $totalChambres): array
    {
        $predictions = [];
        for ($i = 0; $i < $jours; $i++) {
            $date       = now()->addDays($i)->toDateString();
            $estWeekend = now()->addDays($i)->isWeekend();
            $taux       = $estWeekend ? rand(60, 85) : rand(30, 65);
            $nbRes      = (int) round(($taux / 100) * $totalChambres);
            $nbLastMin  = (int) round($nbRes * 0.13);

            $ancienneFallback = Prediction::where('date_prediction', $date)->first();
            if ($ancienneFallback) {
                Alerte::where('prediction_id', $ancienneFallback->id)->delete();
            }

            $prediction = Prediction::updateOrCreate(
                ['date_prediction' => $date],
                [
                    'nb_reservations_predit' => $nbRes,
                    'nb_last_minute_predit'  => $nbLastMin,
                    'taux_occupation_predit' => $taux,
                    'niveau_demande'         => $this->classerNiveauDemande($taux),
                    'confiance'              => 50.0,
                ]
            );

            $this->genererAlertes($prediction);
            $predictions[] = $prediction;
        }
        return $predictions;
    }

    public function calculerPrixRecommande(Prediction $prediction): array
    {
        $prixBase = Chambre::avg('prix_nuit') ?? 35000;

        [$pourcentage, $justification] = match($prediction->niveau_demande) {
            'forte'  => [+20, 'Forte demande prévue : augmentation de 20% recommandée'],
            'faible' => [-15, 'Faible demande prévue : réduction de 15% pour attirer les clients'],
            default  => [0,   'Demande normale : maintien du prix standard'],
        };

        return [
            'prix'          => round($prixBase * (1 + $pourcentage / 100)),
            'pourcentage'   => $pourcentage,
            'justification' => $justification,
        ];
    }
}
