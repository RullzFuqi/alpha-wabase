// lib/ItungImaba.js
import JSDB from '@small-tech/jsdb';
import { gwdb } from '../db/gwdb.js';

const db = JSDB.open(gwdb);

class ItungImaba {
  constructor(name) {
    this.name = name;
    this.user = db.characters.find((char) => char.name === name);

    // kalau user belum ada, otomatis dibuat
    if (!this.user) {
      this.user = { name, score: 0, exp: 0, inventory: [] };
      db.characters.push(this.user);
      console.log(`User ${name} berhasil dibuat!`);
    }
  }

  // Tambah poin
  tambahScore(poin) {
    this.user.score += poin;
    console.log(`${this.name} mendapat ${poin} poin! Total score: ${this.user.score}`);
  }

  // Tambah experience
  tambahExp(exp) {
    this.user.exp += exp;
    console.log(`${this.name} mendapat ${exp} exp! Total exp: ${this.user.exp}`);
  }

  // Tambah item ke inventory
  tambahItem(item) {
    this.user.inventory.push(item);
    console.log(`${this.name} mendapat item: ${item}`);
  }

  // Info user
  info() {
    console.log(`${this.name} - Score: ${this.user.score}, Exp: ${this.user.exp}, Inventory: ${this.user.inventory.join(', ')}`);
  }
}

export default ItungImaba;