pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

template KnownPerson() {
    // Private inputs
    signal input gaitFeature1;
    signal input gaitFeature2;
    signal input gaitFeature3;
    signal input gaitFeature4;
    signal input organizationSalt;

    // Public inputs (stored in organization's allowed profiles)
    signal input publicGaitHash;

    // 1. Compute Poseidon Hash of biometric features with salt
    component hash = Poseidon(5);
    hash.inputs[0] <== gaitFeature1;
    hash.inputs[1] <== gaitFeature2;
    hash.inputs[2] <== gaitFeature3;
    hash.inputs[3] <== gaitFeature4;
    hash.inputs[4] <== organizationSalt;

    // 2. Constraints: calculated Poseidon hash must match publicGaitHash
    hash.out === publicGaitHash;
}

component main {public [publicGaitHash]} = KnownPerson();
