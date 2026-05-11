<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ReservationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Suppression des anciennes réservations...');
        DB::table('reservations')->truncate();

        $this->command->info('Création des clients...');
        $clientIds = $this->createClients();

        $chambres = DB::table('chambres')->get()->toArray();
        $now      = Carbon::now();
        $start    = Carbon::create(2023, 1, 1);
        $end      = Carbon::create(2026, 6, 30);

        $this->command->info('Génération des réservations du ' . $start->format('d/m/Y') . ' au ' . $end->format('d/m/Y') . '...');

        $batch   = [];
        $counter = 1;
        $current = $start->copy();

        while ($current->lte($end)) {
            $demande = $this->getDemande($current);

            $nbMax = match ($demande) {
                'forte'   => rand(3, 6),
                'normale' => rand(1, 3),
                'faible'  => rand(0, 2),
            };

            for ($i = 0; $i < $nbMax; $i++) {
                $isLastMinute = rand(1, 100) <= 25;
                $delai        = $isLastMinute ? rand(0, 2) : rand(5, 90);

                $dateArrivee     = $current->format('Y-m-d');
                $dateDepart      = $current->copy()->addDays(rand(1, 5))->format('Y-m-d');
                $dateReservation = $current->copy()->subDays($delai)->format('Y-m-d');
                $chambre         = $chambres[array_rand($chambres)];
                $dureeNuits      = $current->diffInDays(Carbon::parse($dateDepart));

                $coefficient = match ($demande) {
                    'forte'  => rand(110, 130) / 100,
                    'faible' => rand(85,  95)  / 100,
                    default  => 1.0,
                };
                $prixTotal = round($chambre->prix_nuit * max(1, $dureeNuits) * $coefficient, 2);

                // Statut cohérent avec la date
                if ($current->lt($now->copy()->subDay())) {
                    $r      = rand(1, 100);
                    $statut = match (true) {
                        $r <= 70 => 'terminee',
                        $r <= 85 => 'confirmee',
                        $r <= 93 => 'annulee',
                        default  => 'en_attente',
                    };
                } else {
                    $statut = rand(1, 100) <= 70 ? 'confirmee' : 'en_attente';
                }

                $reference = sprintf('RES-%d-%04d', $current->year, $counter++);
                $ts        = Carbon::now()->toDateTimeString();

                $batch[] = [
                    'reference'         => $reference,
                    'user_id'           => $clientIds[array_rand($clientIds)],
                    'chambre_id'        => $chambre->id,
                    'date_arrivee'      => $dateArrivee,
                    'date_depart'       => $dateDepart,
                    'date_reservation'  => $dateReservation,
                    'nombre_personnes'  => rand(1, $chambre->capacite),
                    'prix_total'        => $prixTotal,
                    'statut'            => $statut,
                    'is_last_minute'    => $isLastMinute ? 1 : 0,
                    'delai_reservation' => $delai,
                    'remarques'         => null,
                    'created_at'        => $ts,
                    'updated_at'        => $ts,
                ];

                // Insérer par lot de 100
                if (count($batch) >= 100) {
                    DB::table('reservations')->insert($batch);
                    $batch = [];
                }
            }

            $current->addDay();
        }

        if (!empty($batch)) {
            DB::table('reservations')->insert($batch);
        }

        $total      = DB::table('reservations')->count();
        $lastMinute = DB::table('reservations')->where('is_last_minute', 1)->count();
        $this->command->info("✅ {$total} réservations générées avec succès !");
        $this->command->info("   Last-minute : {$lastMinute} (" . round($lastMinute / $total * 100) . "%)");
        $this->command->info("   Advance     : " . ($total - $lastMinute) . " (" . round(($total - $lastMinute) / $total * 100) . "%)");
    }

    // ── Logique de demande ────────────────────────────────────────────────────

    private function getDemande(Carbon $date): string
    {
        $month     = $date->month;
        $day       = $date->day;
        $dow       = $date->dayOfWeek;
        $isWeekend = in_array($dow, [0, 5, 6]);

        $hauteSaison = in_array($month, [7, 8, 12, 1]);
        $paques      = ($month === 3 && $day >= 20) || ($month === 4 && $day <= 10);
        $basseSaison = in_array($month, [5, 6, 10, 11]);

        if ($hauteSaison && $isWeekend)  return 'forte';
        if ($hauteSaison)                return 'normale';
        if ($paques && $isWeekend)       return 'forte';
        if ($paques)                     return 'normale';
        if ($basseSaison && !$isWeekend) return 'faible';
        if ($isWeekend)                  return 'normale';

        return 'normale';
    }

    // ── Création des clients ──────────────────────────────────────────────────

    private function createClients(): array
    {
        $data = [
            ['nom' => 'MBARGA',   'prenom' => 'Jean-Pierre',  'email' => 'mbarga.jp@gmail.com',    'telephone' => '+237 677 001 001'],
            ['nom' => 'NGONO',    'prenom' => 'Marie',         'email' => 'ngono.marie@gmail.com',  'telephone' => '+237 699 002 002'],
            ['nom' => 'ESSOMBA',  'prenom' => 'Paul',          'email' => 'essomba.paul@yahoo.fr',  'telephone' => '+237 655 003 003'],
            ['nom' => 'ATEBA',    'prenom' => 'Cécile',        'email' => 'ateba.cecile@gmail.com', 'telephone' => '+237 677 004 004'],
            ['nom' => 'FOUDA',    'prenom' => 'Robert',        'email' => 'fouda.r@outlook.com',    'telephone' => '+237 691 005 005'],
            ['nom' => 'NKOA',     'prenom' => 'Sylvie',        'email' => 'nkoa.sylvie@gmail.com',  'telephone' => '+237 670 006 006'],
            ['nom' => 'MVONDO',   'prenom' => 'Théophile',     'email' => 'mvondo.t@gmail.com',     'telephone' => '+237 680 007 007'],
            ['nom' => 'BIYONG',   'prenom' => 'Hélène',        'email' => 'biyong.h@yahoo.fr',      'telephone' => '+237 695 008 008'],
            ['nom' => 'ABESSOLO', 'prenom' => 'François',      'email' => 'abessolo.f@gmail.com',   'telephone' => '+237 677 009 009'],
            ['nom' => 'MENDO',    'prenom' => 'Albertine',     'email' => 'mendo.a@gmail.com',      'telephone' => '+237 699 010 010'],
            ['nom' => 'NKENGUE',  'prenom' => 'Didier',        'email' => 'nkengue.d@gmail.com',    'telephone' => '+237 655 011 011'],
            ['nom' => 'ETOUDI',   'prenom' => 'Martine',       'email' => 'etoudi.m@outlook.com',   'telephone' => '+237 671 012 012'],
            ['nom' => 'MINKANG',  'prenom' => 'Bernard',       'email' => 'minkang.b@gmail.com',    'telephone' => '+237 685 013 013'],
            ['nom' => 'NTYAM',    'prenom' => 'Bernadette',    'email' => 'ntyam.ber@yahoo.fr',     'telephone' => '+237 697 014 014'],
            ['nom' => 'OWONO',    'prenom' => 'Clément',       'email' => 'owono.c@gmail.com',      'telephone' => '+237 655 015 015'],
            ['nom' => 'BIKELE',   'prenom' => 'Patricia',      'email' => 'bikele.p@gmail.com',     'telephone' => '+237 670 016 016'],
            ['nom' => 'MENGUE',   'prenom' => 'Serge',         'email' => 'mengue.s@gmail.com',     'telephone' => '+237 681 017 017'],
            ['nom' => 'ONANA',    'prenom' => 'Véronique',     'email' => 'onana.v@outlook.com',    'telephone' => '+237 699 018 018'],
            ['nom' => 'TSIMI',    'prenom' => 'Gabriel',       'email' => 'tsimi.g@gmail.com',      'telephone' => '+237 677 019 019'],
            ['nom' => 'ZAMBO',    'prenom' => 'Ghislaine',     'email' => 'zambo.gh@yahoo.fr',      'telephone' => '+237 690 020 020'],
            ['nom' => 'EDOU',     'prenom' => 'Narcisse',      'email' => 'edou.n@gmail.com',       'telephone' => '+237 655 021 021'],
            ['nom' => 'NKOLO',    'prenom' => 'Brigitte',      'email' => 'nkolo.b@gmail.com',      'telephone' => '+237 671 022 022'],
            ['nom' => 'MBIDA',    'prenom' => 'Augustin',      'email' => 'mbida.au@outlook.com',   'telephone' => '+237 686 023 023'],
            ['nom' => 'AKONO',    'prenom' => 'Christine',     'email' => 'akono.chr@gmail.com',    'telephone' => '+237 698 024 024'],
            ['nom' => 'BEYENE',   'prenom' => 'Jérôme',        'email' => 'beyene.j@gmail.com',     'telephone' => '+237 655 025 025'],
            ['nom' => 'ELOUNDOU', 'prenom' => 'Marguerite',   'email' => 'eloundou.m@yahoo.fr',    'telephone' => '+237 677 026 026'],
            ['nom' => 'NNOM',     'prenom' => 'Patrice',       'email' => 'nnom.p@gmail.com',       'telephone' => '+237 689 027 027'],
            ['nom' => 'MINDZIE',  'prenom' => 'Rose',          'email' => 'mindzie.r@gmail.com',    'telephone' => '+237 697 028 028'],
            ['nom' => 'OYONO',    'prenom' => 'Théodore',      'email' => 'oyono.theo@outlook.com', 'telephone' => '+237 655 029 029'],
            ['nom' => 'BILONG',   'prenom' => 'Danielle',      'email' => 'bilong.d@gmail.com',     'telephone' => '+237 670 030 030'],
        ];

        foreach ($data as $client) {
            User::firstOrCreate(
                ['email' => $client['email']],
                array_merge($client, [
                    'password' => Hash::make('client1234'),
                    'role'     => 'client',
                ])
            );
        }

        return User::where('role', 'client')->pluck('id')->toArray();
    }
}
