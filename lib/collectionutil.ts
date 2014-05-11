interface BiDiMapEntry<T1,T2> {
	key1: T1;
	key2: T2;
}

/** A bi-directional map between two types of key.
  *
  * Currently only suitable for small maps.
  */
export class BiDiMap<T1,T2> {
	private entries: BiDiMapEntry<T1,T2>[]

	constructor() {
		this.entries = [];
	}

	add(key1: T1, key2: T2) : BiDiMap<T1,T2> {
		this.entries.push({key1:key1, key2:key2});
		return this;
	}

	get(key1: T1) : T2 {
		for (var i=0; i < this.entries.length; i++) {
			if (this.entries[i].key1 == key1) {
				return this.entries[i].key2;
			}
		}
		return null;
	}

	get2(key2 : T2) : T1 {
		for (var i=0; i < this.entries.length; i++) {
			if (this.entries[i].key2 == key2) {
				return this.entries[i].key1;
			}
		}
		return null;
	}
}

