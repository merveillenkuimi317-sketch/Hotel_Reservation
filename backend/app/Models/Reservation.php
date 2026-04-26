<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference', 'user_id', 'chambre_id',
        'date_arrivee', 'date_depart', 'date_reservation',
        'nombre_personnes', 'prix_total', 'statut',
        'is_last_minute', 'delai_reservation', 'remarques',
    ];

    protected $casts = [
        'date_arrivee'     => 'date',
        'date_depart'      => 'date',
        'date_reservation' => 'date',
        'is_last_minute'   => 'boolean',
        'prix_total'       => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function chambre()
    {
        return $this->belongsTo(Chambre::class);
    }

    protected static function booted(): void
    {
        static::creating(function (Reservation $r) {
            $r->reference        = self::genererReference();
            $r->date_reservation = now()->toDateString();

            $arrivee = Carbon::parse($r->date_arrivee);
            $r->delai_reservation = now()->diffInDays($arrivee, false);
            $r->is_last_minute    = $r->delai_reservation <= 2;

            $nuits         = Carbon::parse($r->date_arrivee)->diffInDays(Carbon::parse($r->date_depart));
            $r->prix_total = $r->chambre->prix_nuit * $nuits;
        });
    }

    public static function genererReference(): string
{
    $annee   = now()->year;
    $dernier = self::whereYear('created_at', $annee)->count() + 1;

    // S'assurer que la référence est unique
    do {
        $reference = sprintf('RES-%d-%04d', $annee, $dernier);
        $existe    = self::where('reference', $reference)->exists();
        if ($existe) $dernier++;
    } while ($existe);

    return $reference;
}
    public function getNombreNuitsAttribute(): int
    {
        return $this->date_arrivee->diffInDays($this->date_depart);
    }
}
