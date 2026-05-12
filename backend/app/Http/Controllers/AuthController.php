<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom'       => 'required|string|max:100',
            'prenom'    => 'required|string|max:100',
            'email'     => 'required|email|unique:users,email',
            'password'  => 'required|string|min:8|confirmed',
            'telephone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'nom'       => $validated['nom'],
            'prenom'    => $validated['prenom'],
            'email'     => $validated['email'],
            'password'  => Hash::make($validated['password']),
            'telephone' => $validated['telephone'] ?? null,
            'role'      => 'client',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inscription réussie',
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Email ou mot de passe incorrect.'],
            ]);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie',
            'user'    => [
                'id'          => $user->id,
                'nom_complet' => $user->nom_complet,
                'email'       => $user->email,
                'role'        => $user->role,
            ],
            'token'   => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('reservations.chambre'));
    }

    public function listerClients(Request $request): JsonResponse
    {
        $clients = User::where('role', 'client')
            ->select('id', 'nom', 'prenom', 'email', 'telephone')
            ->orderBy('nom')
            ->get()
            ->map(fn($u) => [...$u->toArray(), 'nom_complet' => "{$u->prenom} {$u->nom}"]);

        return response()->json($clients);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'ancien_password' => 'required|string',
            'password'        => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->ancien_password, $user->password)) {
            return response()->json(['message' => 'Ancien mot de passe incorrect'], 400);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Mot de passe modifié avec succès']);
    }
}
