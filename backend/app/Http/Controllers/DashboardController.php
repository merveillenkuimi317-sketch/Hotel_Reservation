<?php
namespace App\Http\Controllers;

use App\Models\Chambre;
use App\Models\Reservation;
use App\Models\Prediction;
use App\Models\Alerte;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $mois  = now()->month;
        $annee = now()->year;

        $totalChambres = Chambre::count();

        // Réservations du mois
        $reservationsMois = Reservation::whereMonth('date_arrivee', $mois)
            ->whereYear('date_arrivee', $annee)
            ->get();

        // Taux d'occupation
        $joursOccupes = Reservation::where('statut', '!=', 'annulee')
            ->whereMonth('date_arrivee', $mois)
            ->whereYear('date_arrivee', $annee)
            ->selectRaw('SUM(DATEDIFF(date_depart, date_arrivee)) as total_jours')
            ->value('total_jours') ?? 0;

        $joursDispoMois = \Carbon\Carbon::create($annee, $mois, 1)->daysInMonth * $totalChambres;
        $tauxOccupation = $joursDispoMois > 0
            ? round(($joursOccupes / $joursDispoMois) * 100, 1)
            : 0;

        // Évolution 6 mois
        $evolution = [];
        for ($i = 5; $i >= 0; $i--) {
            $date    = now()->subMonths($i);
            $count   = Reservation::whereMonth('date_arrivee', $date->month)
                ->whereYear('date_arrivee', $date->year)
                ->where('statut', '!=', 'annulee')->count();
            $revenus = Reservation::whereMonth('date_arrivee', $date->month)
                ->whereYear('date_arrivee', $date->year)
                ->where('statut', 'confirmee')
                ->sum('prix_total');
            $evolution[] = [
                'mois'    => $date->format('M Y'),
                'total'   => $count,
                'revenus' => $revenus,
            ];
        }

        // Réservations aujourd'hui
        $aujourdHui = Reservation::whereDate('date_arrivee', now()->toDateString())
            ->where('statut', '!=', 'annulee')
            ->count();

        // Chambres disponibles aujourd'hui
        $chambresDisponibles = Chambre::disponibles(
            now()->toDateString(),
            now()->addDay()->toDateString()
        )->count();

        // Alertes non lues
        $alertesNonLues = Alerte::where('lue', false)->count();

        // Prochaines prédictions
        $predictions = Prediction::where('date_prediction', '>=', now()->toDateString())
            ->orderBy('date_prediction')
            ->take(7)
            ->get();

        return response()->json([
            'kpi' => [
                'taux_occupation'         => $tauxOccupation,
                'total_reservations_mois' => $reservationsMois->count(),
                'last_minute_mois'        => $reservationsMois->where('is_last_minute', true)->count(),
                'revenus_mois'            => $reservationsMois->where('statut', 'confirmee')->sum('prix_total'),
                'arrivees_aujourdhui'     => $aujourdHui,
                'chambres_disponibles'    => $chambresDisponibles,
                'total_chambres'          => $totalChambres,
                'alertes_non_lues'        => $alertesNonLues,
            ],
            'evolution_6_mois' => $evolution,
            'predictions'      => $predictions,
        ]);
    }
}
