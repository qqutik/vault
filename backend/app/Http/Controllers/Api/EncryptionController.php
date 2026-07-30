<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTO\RecoveryKeyDTO;
use App\DTO\WrappedKeyDTO;
use App\Http\Controllers\Controller;
use App\Http\Requests\Encryption\StoreRecoveryKeyRequest;
use App\Http\Requests\Encryption\StoreWrappedKeyRequest;
use App\Http\Resources\RecoveryMaterialResource;
use App\Http\Resources\WrappedKeyResource;
use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Zero-knowledge key bootstrap. The server only ever handles the PRF salt
 * (non-secret) and the wrapped VMK (encrypted); it never sees the VMK itself.
 */
class EncryptionController extends Controller
{
    /**
     * @param  EncryptionService  $encryption
     */
    public function __construct(
        private readonly EncryptionService $encryption,
    ) {}

    /**
     * Ensure a PRF salt exists and report whether ZK is already set up.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function bootstrap(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($this->encryption->bootstrap($user));
    }

    /**
     * Return the wrapped VMK for one of the user's passkeys (null if none yet).
     *
     * @param  Request  $request
     * @return WrappedKeyResource|JsonResponse
     */
    public function wrappedKey(Request $request): WrappedKeyResource|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $credentialId = (string) $request->query('credential_id', '');

        $key = $this->encryption->wrappedKeyFor($user, $credentialId);

        return $key !== null ? new WrappedKeyResource($key) : response()->json(null);
    }

    /**
     * Store the wrapped VMK for one of the user's passkeys (init or add-device).
     *
     * @param  StoreWrappedKeyRequest  $request
     * @return WrappedKeyResource
     */
    public function storeWrappedKey(StoreWrappedKeyRequest $request): WrappedKeyResource
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        abort_unless($this->encryption->ownsCredential($user, $validated['credential_id']), 403);

        return new WrappedKeyResource(
            $this->encryption->storeWrappedKey($user, WrappedKeyDTO::fromArray($validated)),
        );
    }

    /**
     * List which of the user's passkeys are enrolled for encryption.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function enrolled(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($this->encryption->enrolledCredentialIds($user));
    }

    /**
     * Return the recovery-wrapped VMK material (null when recovery isn't set up).
     *
     * @param  Request  $request
     * @return RecoveryMaterialResource|JsonResponse
     */
    public function recovery(Request $request): RecoveryMaterialResource|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $material = $this->encryption->recoveryMaterial($user);

        return $material !== null ? new RecoveryMaterialResource($material) : response()->json(null);
    }

    /**
     * Store the recovery-wrapped VMK for the user.
     *
     * @param  StoreRecoveryKeyRequest  $request
     * @return JsonResponse
     */
    public function storeRecovery(StoreRecoveryKeyRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->encryption->storeRecovery($user, RecoveryKeyDTO::fromArray($request->validated()));

        return response()->json(['recovery_available' => true]);
    }
}
