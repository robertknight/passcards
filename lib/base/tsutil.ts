// Utility functions for TypeScript
//
// This module contains utility functions for 

/** Perform an unchecked cast of v1 from type T1 to type T2.
  * Unlike a normal TypeScript cast (<Type>var) this does not
  * check the compatibility between T2 and T1.
  */
export function unsafeCast<T1,T2>(v1: T1) : T2 {
	return <T2><any>v1;
}

