<?php
namespace App\Http\Controllers;

use App\Models\Chambre;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReservationController extends Controller
{
    public function __construct(private ReservationService $reservationService) {}

    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Reservation::with(['user', 'chambre']);

        if ($user->isClient() || $request->boolean('mine')) {
            $query->where('user_id', $user->id);
        }

        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->has('date_debut')) {
            $query->where('date_arrivee', '>=', $request->date_debut);
        }
        if ($request->has('date_fin')) {
            $query->where('date_depart', '<=', $request->date_fin);
        }
        if ($request->has('is_last_minute')) {
            $query->where('is_last_minute', (bool) $request->is_last_minute);
        }

        $sortField = $request->get('sort', 'date_arrivee');
        $sortDir   = $request->get('dir', 'asc');
        $allowedSorts = ['date_arrivee', 'date_reservation', 'created_at', 'prix_total'];
        if (!in_array($sortField, $allowedSorts)) $sortField = 'date_arrivee';
        if (!in_array($sortDir, ['asc', 'desc'])) $sortDir = 'asc';

        $reservations = $query->orderBy($sortField, $sortDir)
                              ->paginate($request->get('per_page', 15));

        return response()->json($reservations);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'chambre_id'       => 'required|exists:chambres,id',
            'date_arrivee'     => 'required|date|after_or_equal:today',
            'date_depart'      => 'required|date|after:date_arrivee',
            'nombre_personnes' => 'required|integer|min:1',
            'remarques'        => 'nullable|string',
        ];
        if ($user->isGestionnaire()) {
            $rules['user_id'] = 'nullable|exists:users,id';
        }

        $validated = $request->validate($rules);

        $chambre = Chambre::findOrFail($validated['chambre_id']);

        if ($validated['nombre_personnes'] > $chambre->capacite) {
            return response()->json([
                'message' => "Capacité dépassée. Max {$chambre->capacite} personnes.",
            ], 422);
        }

        if (!$chambre->isDisponible($validated['date_arrivee'], $validated['date_depart'])) {
            return response()->json([
                'message' => 'Cette chambre n\'est pas disponible sur cette période.',
            ], 409);
        }

        $clientId = $user->isGestionnaire() && !empty($validated['user_id'])
            ? $validated['user_id']
            : $user->id;

        $reservation = Reservation::create([
            ...$validated,
            'user_id'    => $clientId,
            'chambre_id' => $chambre->id,
            // Réservation sur place → directement confirmée
            'statut'     => $user->isGestionnaire() ? 'confirmee' : 'en_attente',
        ]);

        if ($reservation->is_last_minute) {
            $this->reservationService->notifierLastMinute($reservation);
        }

        return response()->json([
            'message'     => 'Réservation créée avec succès',
            'reservation' => $reservation->load(['chambre', 'user']),
        ], 201);
    }

    public function show(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();

        if ($user->isClient() && $reservation->user_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        return response()->json($reservation->load(['chambre', 'user']));
    }

    public function update(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();

        if ($user->isClient() && $reservation->user_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        if (in_array($reservation->statut, ['annulee', 'terminee'])) {
            return response()->json(['message' => 'Impossible de modifier une réservation ' . $reservation->statut], 422);
        }

        $validated = $request->validate([
            'date_arrivee'     => 'sometimes|date|after_or_equal:today',
            'date_depart'      => 'sometimes|date|after:date_arrivee',
            'nombre_personnes' => 'sometimes|integer|min:1',
            'remarques'        => 'nullable|string',
            'statut'           => 'sometimes|in:confirmee,annulee',
        ]);

        // Seul le gestionnaire peut changer le statut
        if (!$user->isGestionnaire()) {
            unset($validated['statut']);
            if ($user->isClient() && $reservation->statut === 'confirmee') {
                $validated['statut'] = 'en_attente';
            }
        }

        $reservation->update($validated);

        return response()->json([
            'message'     => 'Réservation mise à jour',
            'reservation' => $reservation->fresh(['chambre', 'user']),
        ]);
    }

    public function annuler(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();

        if ($user->isClient() && $reservation->user_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé'], 403);
        }

        if ($reservation->statut === 'annulee') {
            return response()->json(['message' => 'Déjà annulée'], 422);
        }

        $reservation->update(['statut' => 'annulee']);

        return response()->json(['message' => 'Réservation annulée avec succès']);
    }

    public function statistiques(Request $request): JsonResponse
    {
        $mois  = $request->get('mois', now()->month);
        $annee = $request->get('annee', now()->year);

        $totalChambres = Chambre::count();

        $reservationsMois = Reservation::whereMonth('date_arrivee', $mois)
            ->whereYear('date_arrivee', $annee)->get();

        $joursOccupes = Reservation::where('statut', '!=', 'annulee')
            ->whereMonth('date_arrivee', $mois)->whereYear('date_arrivee', $annee)
            ->selectRaw('SUM(DATEDIFF(date_depart, date_arrivee)) as total_jours')
            ->value('total_jours') ?? 0;

        $joursDispoMois = \Carbon\Carbon::create($annee, $mois, 1)->daysInMonth * $totalChambres;
        $tauxOccupation = $joursDispoMois > 0
            ? round(($joursOccupes / $joursDispoMois) * 100, 1)
            : 0;

        $evolution = [];
        for ($i = 5; $i >= 0; $i--) {
            $date  = now()->subMonths($i);
            $count = Reservation::whereMonth('date_arrivee', $date->month)
                ->whereYear('date_arrivee', $date->year)
                ->where('statut', '!=', 'annulee')->count();
            $evolution[] = [
                'mois'  => $date->format('M Y'),
                'total' => $count,
            ];
        }

        return response()->json([
            'taux_occupation'         => $tauxOccupation,
            'total_reservations_mois' => $reservationsMois->count(),
            'last_minute_mois'        => $reservationsMois->where('is_last_minute', true)->count(),
            'revenus_mois'            => $reservationsMois->where('statut', 'confirmee')->sum('prix_total'),
            'total_chambres'          => $totalChambres,
            'evolution_6_mois'        => $evolution,
        ]);
    }
}
