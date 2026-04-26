<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Prediction extends Model
{
    use HasFactory;

    protected $fillable = [
        'date_prediction',
        'nb_reservations_predit',
        'nb_last_minute_predit',
        'taux_occupation_predit',
        'prix_recommande',
        'niveau_demande',
        'alerte',
        'confiance',
    ];

    protected $casts = [
        'date_prediction'        => 'date',
        'taux_occupation_predit' => 'decimal:2',
        'prix_recommande'        => 'decimal:2',
        'confiance'              => 'decimal:2',
    ];

    public function alertes()
    {
        return $this->hasMany(Alerte::class);
    }
}
