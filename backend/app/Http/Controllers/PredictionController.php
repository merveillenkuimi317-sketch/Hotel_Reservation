<?php
namespace App\Http\Controllers;

use App\Models\Prediction;
use App\Models\Alerte;
use App\Services\PredictionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PredictionController extends Controller
{
    public function __construct(private PredictionService $predictionService) {}

    public function index(Request $request): JsonResponse
    {
        $jours = $request->get('jours', 7);

        $predictions = Prediction::where('date_prediction', '>=', now()->toDateString())
            ->orderBy('date_prediction')
            ->take($jours)
            ->get();

        if ($predictions->count() < $jours) {
            $predictions = $this->predictionService->genererPredictions($jours);
        }

        return response()->json($predictions);
    }

    public function lancer(Request $request): JsonResponse
    {
        $jours = $request->get('jours', 7);

        try {
            $metriques   = $this->predictionService->entrainerModele();
            $predictions = $this->predictionService->genererPredictions($jours);

            return response()->json([
                'message'     => "Modèle réentraîné et prédictions générées pour {$jours} jours",
                'metriques'   => $metriques,
                'predictions' => $predictions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur : ' . $e->getMessage(),
            ], 500);
        }
    }

    public function alertes(): JsonResponse
    {
        $alertes = Alerte::with('prediction')
            ->where('lue', false)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($alertes);
    }

    public function marquerAlerteLue(Alerte $alerte): JsonResponse
    {
        $alerte->update(['lue' => true]);
        return response()->json(['message' => 'Alerte marquée comme lue']);
    }

    public function recommandationPrix(Request $request): JsonResponse
    {
        $request->validate(['date' => 'required|date']);

        $prediction = Prediction::where('date_prediction', $request->date)->first();

        if (!$prediction) {
            $predictions = $this->predictionService->genererPredictions(1);
            $prediction  = $predictions[0];
        }

        $recommandation = $this->predictionService->calculerPrixRecommande($prediction);

        return response()->json([
            'date'              => $request->date,
            'niveau_demande'    => $prediction->niveau_demande,
            'taux_occupation'   => $prediction->taux_occupation_predit,
            'prix_recommande'   => $recommandation['prix'],
            'justification'     => $recommandation['justification'],
            'pourcentage_ajust' => $recommandation['pourcentage'],
        ]);
    }
}
