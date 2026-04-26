<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChambreController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\PredictionController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// ── Routes publiques ──────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

Route::get('/chambres',           [ChambreController::class, 'index']);
Route::get('/chambres/{chambre}', [ChambreController::class, 'show']);

// ── Routes protégées ──────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout',  [AuthController::class, 'logout']);
    Route::get('/auth/me',       [AuthController::class, 'me']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);

    // Réservations
    Route::get('/reservations',                         [ReservationController::class, 'index']);
    Route::post('/reservations',                        [ReservationController::class, 'store']);
    Route::get('/reservations/{reservation}',           [ReservationController::class, 'show']);
    Route::put('/reservations/{reservation}',           [ReservationController::class, 'update']);
    Route::patch('/reservations/{reservation}/annuler', [ReservationController::class, 'annuler']);

    // ── Admin + Gestionnaire ──────────────────────────────────────────────
    Route::middleware('role:admin,gestionnaire')->group(function () {

        // Chambres
        Route::post('/chambres',             [ChambreController::class, 'store']);
        Route::put('/chambres/{chambre}',    [ChambreController::class, 'update']);
        Route::delete('/chambres/{chambre}', [ChambreController::class, 'destroy']);
        Route::get('/chambres-stats',        [ChambreController::class, 'statistiques']);

        // Dashboard
        Route::get('/dashboard',          [DashboardController::class, 'index']);
        Route::get('/reservations-stats', [ReservationController::class, 'statistiques']);

        // Prédictions
        Route::get('/predictions',              [PredictionController::class, 'index']);
        Route::post('/predictions/lancer',      [PredictionController::class, 'lancer']);
        Route::get('/predictions/alertes',      [PredictionController::class, 'alertes']);
        Route::patch('/alertes/{alerte}/lue',   [PredictionController::class, 'marquerAlerteLue']);
        Route::get('/predictions/prix',         [PredictionController::class, 'recommandationPrix']);
    });
});
