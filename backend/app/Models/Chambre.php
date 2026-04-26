<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Chambre extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero', 'type', 'prix_nuit', 'capacite',
        'description', 'equipements', 'photo', 'statut', 'etage',
    ];

    protected $casts = [
        'equipements' => 'array',
        'prix_nuit'   => 'decimal:2',
    ];

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function isDisponible(string $dateArrivee, string $dateDepart): bool
    {
        $conflits = $this->reservations()
            ->where('statut', '!=', 'annulee')
            ->where(function ($q) use ($dateArrivee, $dateDepart) {
                $q->whereBetween('date_arrivee', [$dateArrivee, $dateDepart])
                  ->orWhereBetween('date_depart', [$dateArrivee, $dateDepart])
                  ->orWhere(function ($q2) use ($dateArrivee, $dateDepart) {
                      $q2->where('date_arrivee', '<=', $dateArrivee)
                         ->where('date_depart', '>=', $dateDepart);
                  });
            })->count();

        return $conflits === 0;
    }

    public function scopeDisponibles($query, $dateArrivee, $dateDepart)
    {
        return $query->where('statut', '!=', 'maintenance')
            ->whereDoesntHave('reservations', function ($q) use ($dateArrivee, $dateDepart) {
                $q->where('statut', '!=', 'annulee')
                  ->where('date_arrivee', '<', $dateDepart)
                  ->where('date_depart', '>', $dateArrivee);
            });
    }
}
