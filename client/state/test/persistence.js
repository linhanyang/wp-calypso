/** @format */
/**
 * Internal dependencies
 */
import { DESERIALIZE, SERIALIZE } from 'state/action-types';
import { createReduxStore } from 'state';
import reducer from 'state/reducer';

// Gets rid of warnings such as 'UnhandledPromiseRejectionWarning: Error: No available storage method found.'
jest.mock( 'lib/user', () => () => {} );

describe( 'persistence', () => {
	test( 'initial state should serialize and deserialize without errors or warnings', () => {
		const consoleErrorSpy = jest
			.spyOn( global.console, 'error' )
			.mockImplementation( () => () => {} );
		const consoleWarnSpy = jest
			.spyOn( global.console, 'warn' )
			.mockImplementation( () => () => {} );

		const initialState = createReduxStore( reducer ).getState();
		reducer( reducer( initialState, { type: SERIALIZE } ).root(), { type: DESERIALIZE } );

		expect( consoleErrorSpy ).not.toHaveBeenCalled();
		expect( consoleWarnSpy ).not.toHaveBeenCalled();
	} );
} );
