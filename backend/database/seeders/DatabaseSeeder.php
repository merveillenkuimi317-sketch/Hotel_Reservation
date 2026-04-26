<?php
namespace Database\Seeders;

use App\Models\Chambre;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'nom'       => 'Admin',
            'prenom'    => 'Super',
            'email'     => 'admin@hotel.cm',
            'password'  => Hash::make('admin1234'),
            'role'      => 'admin',
            'telephone' => '+237 600 000 000',
        ]);

        User::create([
            'nom'       => 'CHAGO',
            'prenom'    => 'DYLAN',
            'email'     => 'gestionnaire@hotel.cm',
            'password'  => Hash::make('gestionnaire1234'),
            'role'      => 'gestionnaire',
        ]);

        User::create([
            'nom'       => 'NGUEPAA',
            'prenom'    => 'SONIA',
            'email'     => 'client@hotel.cm',
            'password'  => Hash::make('client1234'),
            'role'      => 'client',
        ]);

        $chambres = [
            ['numero'=>'101','type'=>'simple',   'prix_nuit'=>25000,  'capacite'=>1,'etage'=>1,'equipements'=>['wifi','tv','climatisation']],
            ['numero'=>'102','type'=>'simple',   'prix_nuit'=>25000,  'capacite'=>1,'etage'=>1,'equipements'=>['wifi','tv','climatisation']],
            ['numero'=>'103','type'=>'simple',   'prix_nuit'=>27000,  'capacite'=>2,'etage'=>1,'equipements'=>['wifi','tv','climatisation','minibar']],
            ['numero'=>'201','type'=>'double',   'prix_nuit'=>40000,  'capacite'=>2,'etage'=>2,'equipements'=>['wifi','tv','climatisation','baignoire']],
            ['numero'=>'202','type'=>'double',   'prix_nuit'=>40000,  'capacite'=>2,'etage'=>2,'equipements'=>['wifi','tv','climatisation']],
            ['numero'=>'203','type'=>'double',   'prix_nuit'=>42000,  'capacite'=>3,'etage'=>2,'equipements'=>['wifi','tv','climatisation','minibar']],
            ['numero'=>'301','type'=>'familiale','prix_nuit'=>65000,  'capacite'=>4,'etage'=>3,'equipements'=>['wifi','tv','climatisation','cuisine']],
            ['numero'=>'302','type'=>'familiale','prix_nuit'=>65000,  'capacite'=>5,'etage'=>3,'equipements'=>['wifi','tv','climatisation','cuisine','baignoire']],
            ['numero'=>'401','type'=>'suite',    'prix_nuit'=>95000,  'capacite'=>2,'etage'=>4,'equipements'=>['wifi','tv','climatisation','jacuzzi','terrasse','minibar']],
            ['numero'=>'402','type'=>'suite',    'prix_nuit'=>120000, 'capacite'=>4,'etage'=>4,'equipements'=>['wifi','tv','climatisation','jacuzzi','terrasse','minibar','salon']],
        ];

        foreach ($chambres as $data) {
            Chambre::create($data);
        }

        $this->command->info('✅ Données insérées avec succès !');
        $this->command->info('   admin@hotel.cm        / admin1234');
        $this->command->info('   gestionnaire@hotel.cm / gestionnaire1234');
        $this->command->info('   client@hotel.cm       / client1234');
    }
}
