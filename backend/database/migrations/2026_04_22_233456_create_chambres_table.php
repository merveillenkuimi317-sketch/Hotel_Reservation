<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chambres', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();
            $table->enum('type', ['simple', 'double', 'suite', 'familiale']);
            $table->decimal('prix_nuit', 10, 2);
            $table->integer('capacite');
            $table->text('description')->nullable();
            $table->json('equipements')->nullable();
            $table->string('photo')->nullable();
            $table->enum('statut', ['disponible', 'occupee', 'maintenance'])->default('disponible');
            $table->integer('etage')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chambres');
    }
};
