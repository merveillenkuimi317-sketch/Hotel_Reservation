<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('predictions', function (Blueprint $table) {
            $table->id();
            $table->date('date_prediction');
            $table->integer('nb_reservations_predit');
            $table->integer('nb_last_minute_predit');
            $table->decimal('taux_occupation_predit', 5, 2);
            $table->decimal('prix_recommande', 10, 2)->nullable();
            $table->enum('niveau_demande', ['faible', 'normale', 'forte'])->default('normale');
            $table->string('alerte')->nullable();
            $table->decimal('confiance', 5, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('alertes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prediction_id')->nullable()->constrained('predictions')->onDelete('cascade');
            $table->enum('type', ['forte_demande', 'faible_demande', 'prix', 'disponibilite']);
            $table->string('message');
            $table->boolean('lue')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertes');
        Schema::dropIfExists('predictions');
    }
};
