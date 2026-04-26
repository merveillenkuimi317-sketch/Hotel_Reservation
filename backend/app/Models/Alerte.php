<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Alerte extends Model
{
    use HasFactory;

    protected $fillable = [
        'prediction_id',
        'type',
        'message',
        'lue',
    ];

    protected $casts = [
        'lue' => 'boolean',
    ];

    public function prediction()
    {
        return $this->belongsTo(Prediction::class);
    }
}
