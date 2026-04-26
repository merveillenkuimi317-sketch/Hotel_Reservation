<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('reservations:cloturer', function () {
    $count = DB::table('reservations')
        ->where('date_depart', '<', now()->toDateString())
        ->whereNotIn('statut', ['terminee', 'annulee'])
        ->update(['statut' => 'terminee']);

    $this->info("✅ {$count} réservation(s) marquée(s) comme terminée(s).");
})->purpose('Clôturer les réservations dont la date de départ est passée');

Schedule::command('reservations:cloturer')->dailyAt('01:00');
