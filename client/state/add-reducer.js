/**
 * Internal Dependencies
 */
import { APPLY_STORED_STATE } from 'state/action-types';
import { getStateFromLocalStorage } from 'state/initial-state';

export const addReducerToStore = store => async ( key, reducer ) => {
	store.addReducer( key, reducer );
	const { storageKey } = reducer;
	if ( storageKey ) {
		const storedState = await getStateFromLocalStorage( reducer, storageKey );
		if ( storedState ) {
			store.dispatch( { type: APPLY_STORED_STATE, storageKey, storedState } );
		}
	}
}
