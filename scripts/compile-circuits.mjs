#!/usr/bin/env node
// ============================================================
// WGF SenseOS — ZKP compilation and Ceremony script
// ============================================================
// Performs compilation of circom circuits and runs a local
// Powers of Tau setup using snarkjs to produce build assets.
// ============================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const PRIVACY_DIR = path.join(ROOT_DIR, 'packages', 'uwsc-privacy-core');
const CIRCUITS_SRC_DIR = path.join(PRIVACY_DIR, 'circuits');
const NEXT_CIRC_DIR = path.join(ROOT_DIR, 'wgf-senseos', 'circuits');
const TEMP_BUILD_DIR = path.join(PRIVACY_DIR, 'build');

console.log(`\n🔒 WGF SenseOS — ZKP Compiler Tool`);
console.log(`   Root Directory: ${ROOT_DIR}`);
console.log(`   Circuits Src  : ${CIRCUITS_SRC_DIR}`);
console.log(`   Next.js Target: ${NEXT_CIRC_DIR}\n`);

// 1. Check if circom compiler is available
let hasCircom = false;
try {
  const version = execSync('circom --version', { stdio: 'pipe' }).toString().trim();
  console.log(`✅ circom compiler detected: ${version}`);
  hasCircom = true;
} catch (err) {
  console.log(`⚠️ circom compiler not found on system path.`);
  console.log(`\n=== HOW TO INSTALL CIRCOM ===`);
  console.log(`Windows:`);
  console.log(`  1. Download "circom-windows-amd64.exe" from github.com/iden3/circom/releases`);
  console.log(`  2. Rename the binary to "circom.exe"`);
  console.log(`  3. Move it to a folder in your System PATH (e.g., C:\\Windows\\System32 or a custom bin folder)`);
  console.log(`  Or build using Rust: cargo install circom\n`);
  console.log(`macOS / Linux:`);
  console.log(`  Install using Rust:`);
  console.log(`  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`);
  console.log(`  cargo install circom\n`);
  console.log(`=============================\n`);
}

// Ensure target directories exist
if (!fs.existsSync(TEMP_BUILD_DIR)) {
  fs.mkdirSync(TEMP_BUILD_DIR, { recursive: true });
}
if (!fs.existsSync(NEXT_CIRC_DIR)) {
  fs.mkdirSync(NEXT_CIRC_DIR, { recursive: true });
}

if (!hasCircom) {
  console.log('❌ Compilation halted. Please install circom and try again.');
  console.log('   The Next.js application will run in simulated ZKP mode in the meantime.');
  process.exit(0);
}

// 2. Perform SnarkJS ceremony and circuit compilation
const circuits = ['fall_detected', 'known_person'];

try {
  process.chdir(PRIVACY_DIR);

  // A. Generate local Powers of Tau (pot12) for development testing (up to 4096 constraints)
  const ptauFile = path.join(TEMP_BUILD_DIR, 'pot12_final.ptau');
  if (!fs.existsSync(ptauFile)) {
    console.log(`⚙️ Generating local Powers of Tau (pot12) ceremony...`);
    execSync(`npx snarkjs powersoftau new bn128 12 "${path.join(TEMP_BUILD_DIR, 'pot12_0000.ptau')}" -v`, { stdio: 'inherit' });
    execSync(`npx snarkjs powersoftau contribute "${path.join(TEMP_BUILD_DIR, 'pot12_0000.ptau')}" "${path.join(TEMP_BUILD_DIR, 'pot12_0001.ptau')}" --name="Dev Contributor" -v -e="WGF SenseOS dev entropy"`, { stdio: 'inherit' });
    execSync(`npx snarkjs powersoftau prepare phase2 "${path.join(TEMP_BUILD_DIR, 'pot12_0001.ptau')}" "${ptauFile}" -v`, { stdio: 'inherit' });
    
    // Clean up initial ptau files
    fs.unlinkSync(path.join(TEMP_BUILD_DIR, 'pot12_0000.ptau'));
    fs.unlinkSync(path.join(TEMP_BUILD_DIR, 'pot12_0001.ptau'));
    console.log(`✅ Powers of Tau generated at: ${ptauFile}`);
  }

  for (const name of circuits) {
    console.log(`\n=== Compiling Circuit: ${name} ===`);

    const circuitPath = path.join(CIRCUITS_SRC_DIR, `${name}.circom`);
    
    // B. Compile circuit to WASM and R1CS
    execSync(`circom "${circuitPath}" --r1cs --wasm --sym --output "${TEMP_BUILD_DIR}"`, { stdio: 'inherit' });

    // C. Perform setup & Zkey creation
    const r1csPath = path.join(TEMP_BUILD_DIR, `${name}.r1cs`);
    const zkeyZero = path.join(TEMP_BUILD_DIR, `${name}_0000.zkey`);
    const zkeyFinal = path.join(TEMP_BUILD_DIR, `${name}.zkey`);
    const vkeyJson = path.join(TEMP_BUILD_DIR, `${name}_vkey.json`);

    console.log(`⚙️ Setting up Groth16 proving keys...`);
    execSync(`npx snarkjs groth16 setup "${r1csPath}" "${ptauFile}" "${zkeyZero}"`, { stdio: 'inherit' });
    execSync(`npx snarkjs zkey contribute "${zkeyZero}" "${zkeyFinal}" --name="Dev contributor" -v -e="SenseOS Zkey entropy"`, { stdio: 'inherit' });
    execSync(`npx snarkjs zkey export verificationkey "${zkeyFinal}" "${vkeyJson}"`, { stdio: 'inherit' });

    // Clean up zero zkey
    if (fs.existsSync(zkeyZero)) fs.unlinkSync(zkeyZero);

    // D. Copy outputs to Next.js
    console.log(`⚙️ Copying build files to Next.js app...`);
    const wasmSource = path.join(TEMP_BUILD_DIR, `${name}_js`, `${name}.wasm`);
    
    fs.copyFileSync(wasmSource, path.join(NEXT_CIRC_DIR, `${name}.wasm`));
    fs.copyFileSync(zkeyFinal, path.join(NEXT_CIRC_DIR, `${name}.zkey`));
    fs.copyFileSync(vkeyJson, path.join(NEXT_CIRC_DIR, `${name}_vkey.json`));

    console.log(`🎉 Circuit "${name}" setup completed successfully!`);
    console.log(`   WASM: ${path.join(NEXT_CIRC_DIR, `${name}.wasm`)}`);
    console.log(`   ZKEY: ${path.join(NEXT_CIRC_DIR, `${name}.zkey`)}`);
    console.log(`   VKEY: ${path.join(NEXT_CIRC_DIR, `${name}_vkey.json`)}`);
  }

  console.log(`\n💎 All circuits compiled and ZKP assets prepared for local Next.js environment!`);

} catch (err) {
  console.error(`❌ Compilation ceremony failed:`, err);
  process.exit(1);
}
