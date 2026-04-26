<?php
namespace App\Services;

use App\Models\Reservation;
use App\Models\Alerte;

class ReservationService
{
    public function notifierLastMinute(Reservation $reservation): void
    {
        Alerte::create([
            'prediction_id' => null,
            'type'          => 'forte_demande',
            'message'       => "Nouvelle réservation last-minute #{$reservation->reference} — "
                             . "Chambre {$reservation->chambre->numero} — "
                             . "Arrivée : {$reservation->date_arrivee->format('d/m/Y')}",
        ]);
    }

    public function exporterDonneesML(): array
    {
        return Reservation::where('statut', '!=', 'annulee')
            ->with('chambre')
            ->get()
            ->map(function (Reservation $r) {
                $arrivee = $r->date_arrivee;
                return [
                    'date_arrivee'      => $arrivee->toDateString(),
                    'annee'             => $arrivee->year,
                    'mois'              => $arrivee->month,
                    'jour'              => $arrivee->day,
                    'jour_semaine'      => $arrivee->dayOfWeek,
                    'est_weekend'       => (int) $arrivee->isWeekend(),
                    'delai_reservation' => $r->delai_reservation,
                    'is_last_minute'    => (int) $r->is_last_minute,
                    'nombre_nuits'      => $r->nombre_nuits,
                    'nombre_personnes'  => $r->nombre_personnes,
                    'type_chambre'      => $r->chambre->type,
                    'prix_total'        => (float) $r->prix_total,
                ];
            })->toArray();
    }

    public function calculerTauxOccupation(string $debut, string $fin): float
    {
        $totalChambres = \App\Models\Chambre::where('statut', '!=', 'maintenance')->count();
        $nbJours       = now()->parse($debut)->diffInDays($fin);
        $totalNuits    = $totalChambres * $nbJours;

        if ($totalNuits === 0) return 0;

        $nuitsOccupees = Reservation::where('statut', '!=', 'annulee')
            ->where('date_arrivee', '<', $fin)
            ->where('date_depart', '>', $debut)
            ->selectRaw('SUM(DATEDIFF(
                LEAST(date_depart, ?), GREATEST(date_arrivee, ?)
            )) as nuits', [$fin, $debut])
            ->value('nuits') ?? 0;

        return round(($nuitsOccupees / $totalNuits) * 100, 2);
    }
}
