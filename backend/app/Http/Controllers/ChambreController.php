<?php
namespace App\Http\Controllers;

use App\Models\Chambre;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ChambreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Chambre::query();

        if ($request->has(['date_arrivee', 'date_depart'])) {
            $query->disponibles($request->date_arrivee, $request->date_depart);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('capacite')) {
            $query->where('capacite', '>=', $request->capacite);
        }

        if ($request->has('prix_max')) {
            $query->where('prix_nuit', '<=', $request->prix_max);
        }

        $chambres = $query->orderBy('type')->orderBy('numero')->get();

        return response()->json($chambres);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'numero'      => 'required|string|unique:chambres,numero',
            'type'        => 'required|in:simple,double,suite,familiale',
            'prix_nuit'   => 'required|numeric|min:0',
            'capacite'    => 'required|integer|min:1|max:10',
            'description' => 'nullable|string',
            'equipements' => 'nullable|array',
            'etage'       => 'nullable|integer|min:0',
        ]);

        $chambre = Chambre::create($validated);

        return response()->json([
            'message' => 'Chambre créée avec succès',
            'chambre' => $chambre,
        ], 201);
    }

    public function show(Chambre $chambre): JsonResponse
    {
        $chambre->load(['reservations' => function ($q) {
            $q->where('statut', '!=', 'annulee')
              ->where('date_depart', '>=', now())
              ->orderBy('date_arrivee');
        }]);

        return response()->json($chambre);
    }

    public function update(Request $request, Chambre $chambre): JsonResponse
    {
        $validated = $request->validate([
            'numero'      => 'sometimes|string|unique:chambres,numero,' . $chambre->id,
            'type'        => 'sometimes|in:simple,double,suite,familiale',
            'prix_nuit'   => 'sometimes|numeric|min:0',
            'capacite'    => 'sometimes|integer|min:1|max:10',
            'description' => 'nullable|string',
            'equipements' => 'nullable|array',
            'statut'      => 'sometimes|in:disponible,occupee,maintenance',
            'etage'       => 'nullable|integer|min:0',
        ]);

        $chambre->update($validated);

        return response()->json([
            'message' => 'Chambre mise à jour',
            'chambre' => $chambre,
        ]);
    }

    public function destroy(Chambre $chambre): JsonResponse
    {
        $reservationsActives = $chambre->reservations()
            ->whereIn('statut', ['en_attente', 'confirmee'])
            ->where('date_depart', '>=', now())
            ->count();

        if ($reservationsActives > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer : cette chambre a des réservations actives.',
            ], 409);
        }

        $chambre->delete();

        return response()->json(['message' => 'Chambre supprimée']);
    }

    public function statistiques(): JsonResponse
    {
        return response()->json([
            'total'       => Chambre::count(),
            'disponibles' => Chambre::where('statut', 'disponible')->count(),
            'occupees'    => Chambre::where('statut', 'occupee')->count(),
            'maintenance' => Chambre::where('statut', 'maintenance')->count(),
            'par_type'    => Chambre::selectRaw('type, count(*) as total, avg(prix_nuit) as prix_moyen')
                                     ->groupBy('type')->get(),
        ]);
    }
}
