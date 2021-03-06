/**
 * External dependencies
 */
import { get, includes } from 'lodash';

/**
 * WordPress dependencies
 */
import deprecated from '@wordpress/deprecated';

/**
 * Returns the current editing mode.
 *
 * @param {Object} state Global application state.
 *
 * @return {string} Editing mode.
 */
export function getEditorMode( state ) {
	return getPreference( state, 'editorMode', 'visual' );
}

/**
 * Returns true if the editor sidebar is opened.
 *
 * @param {Object} state Global application state
 *
 * @return {boolean} Whether the editor sidebar is opened.
 */
export function isEditorSidebarOpened( state ) {
	const activeGeneralSidebar = getActiveGeneralSidebarName( state );

	return includes( [ 'edit-post/document', 'edit-post/block' ], activeGeneralSidebar );
}

/**
 * Returns true if the plugin sidebar is opened.
 *
 * @param {Object} state Global application state
 * @return {boolean}     Whether the plugin sidebar is opened.
 */
export function isPluginSidebarOpened( state ) {
	const activeGeneralSidebar = getActiveGeneralSidebarName( state );
	return !! activeGeneralSidebar && ! isEditorSidebarOpened( state );
}

/**
 * Returns the current active general sidebar name, or null if there is no
 * general sidebar active. The active general sidebar is a unique name to
 * identify either an editor or plugin sidebar.
 *
 * Examples:
 *
 *  - `edit-post/document`
 *  - `my-plugin/insert-image-sidebar`
 *
 * @param {Object} state Global application state.
 *
 * @return {?string} Active general sidebar name.
 */
export function getActiveGeneralSidebarName( state ) {
	// Dismissal takes precedent.
	const isDismissed = getPreference( state, 'isGeneralSidebarDismissed', false );
	if ( isDismissed ) {
		return null;
	}

	return state.activeGeneralSidebar;
}

/**
 * Returns the preferences (these preferences are persisted locally).
 *
 * @param {Object} state Global application state.
 *
 * @return {Object} Preferences Object.
 */
export function getPreferences( state ) {
	return state.preferences;
}

/**
 *
 * @param {Object} state         Global application state.
 * @param {string} preferenceKey Preference Key.
 * @param {Mixed}  defaultValue  Default Value.
 *
 * @return {Mixed} Preference Value.
 */
export function getPreference( state, preferenceKey, defaultValue ) {
	const preferences = getPreferences( state );
	const value = preferences[ preferenceKey ];
	return value === undefined ? defaultValue : value;
}

/**
 * Returns true if the publish sidebar is opened.
 *
 * @param {Object} state Global application state
 *
 * @return {boolean} Whether the publish sidebar is open.
 */
export function isPublishSidebarOpened( state ) {
	return state.publishSidebarActive;
}

/**
 * Returns true if the given panel is enabled, or false otherwise. Panels are
 * enabled by default.
 *
 * @param {Object} state     Global application state.
 * @param {string} panelName A string that identifies the panel.
 *
 * @return {boolean} Whether or not the panel is enabled.
 */
export function isEditorPanelEnabled( state, panelName ) {
	const panels = getPreference( state, 'panels' );
	return get( panels, [ panelName, 'enabled' ], true );
}

/**
 * Returns true if the given panel is enabled, or false otherwise. Panels are
 * enabled by default.
 *
 * @param {Object} state Global application state.
 * @param {string} panel A string that identifies the panel.
 *
 * @return {boolean} Whether or not the panel is enabled.
 */
export function isEditorSidebarPanelOpened( state, panel ) {
	deprecated( 'isEditorSidebarPanelOpened', {
		alternative: 'isEditorPanelEnabled',
		plugin: 'Gutenberg',
		version: '4.3',
	} );
	return isEditorPanelEnabled( state, panel );
}

/**
 * Returns true if the given panel is open, or false otherwise. Panels are
 * closed by default.
 *
 * @param  {Object}  state     Global application state.
 * @param  {string}  panelName A string that identifies the panel.
 *
 * @return {boolean} Whether or not the panel is open.
 */
export function isEditorPanelOpened( state, panelName ) {
	const panels = getPreference( state, 'panels' );
	return panels[ panelName ] === true || get( panels, [ panelName, 'opened' ], false );
}

/**
 * Returns true if a modal is active, or false otherwise.
 *
 * @param  {Object}  state 	   Global application state.
 * @param  {string}  modalName A string that uniquely identifies the modal.
 *
 * @return {boolean} Whether the modal is active.
 */
export function isModalActive( state, modalName ) {
	return state.activeModal === modalName;
}

/**
 * Returns whether the given feature is enabled or not.
 *
 * @param {Object} state   Global application state.
 * @param {string} feature Feature slug.
 *
 * @return {boolean} Is active.
 */
export function isFeatureActive( state, feature ) {
	return !! state.preferences.features[ feature ];
}

/**
 * Returns true if the plugin item is pinned to the header.
 * When the value is not set it defaults to true.
 *
 * @param  {Object}  state      Global application state.
 * @param  {string}  pluginName Plugin item name.
 *
 * @return {boolean} Whether the plugin item is pinned.
 */
export function isPluginItemPinned( state, pluginName ) {
	const pinnedPluginItems = getPreference( state, 'pinnedPluginItems', {} );

	return get( pinnedPluginItems, [ pluginName ], true );
}
