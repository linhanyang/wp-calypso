/** @format */

/**
 * External dependencies
 */
import { __, _n } from 'gutenberg/extensions/presets/jetpack/utils/i18n';
import { Component, Fragment } from '@wordpress/element';
import { compose, withInstanceId } from '@wordpress/compose';
import { ErrorMessage, Form, Field, withFormik } from 'formik';
import { InspectorControls } from '@wordpress/editor';
import { sprintf } from '@wordpress/i18n';
import { withSelect } from '@wordpress/data';
import {
	BaseControl,
	ExternalLink,
	PanelBody,
	SelectControl,
	TextareaControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import classNames from 'classnames';
import emailValidator from 'email-validator';
import get from 'lodash/get';
import trimEnd from 'lodash/trimEnd';

/**
 * Internal dependencies
 */
import { getCurrencyDefaults } from 'lib/format-currency/currencies';
import {
	SIMPLE_PAYMENTS_PRODUCT_POST_TYPE,
	SUPPORTED_CURRENCY_LIST,
} from 'lib/simple-payments/constants';
import ProductPlaceholder from './product-placeholder';
import HelpMessage from './help-message';

const DisplayFormikState = props => (
	<div style={ { margin: '1rem 0' } }>
		<pre
			style={ {
				background: '#f6f8fa',
				fontSize: '.65rem',
				padding: '.5rem',
			} }
		>
			<strong>props</strong> = { JSON.stringify( props, null, 2 ) }
		</pre>
	</div>
);

class SimplePaymentsEdit extends Component {
	state = {
		fieldPriceError: null,
		fieldTitleError: null,
		isSavingProduct: false,
	};

	componentDidUpdate( prevProps ) {
		const { attributes, isLoadingInitial, isSelected, setAttributes, simplePayment } = this.props;
		const { content, currency, email, multiple, price, title } = attributes;

		// @TODO check componentDidMount for the case where post was already loaded
		if ( ! prevProps.simplePayment && simplePayment ) {
			setAttributes( {
				content: get( simplePayment, [ 'content', 'raw' ], content ),
				currency: get( simplePayment, [ 'meta', 'spay_currency' ], currency ),
				email: get( simplePayment, [ 'meta', 'spay_email' ], email ),
				multiple: Boolean( get( simplePayment, [ 'meta', 'spay_multiple' ], Boolean( multiple ) ) ),
				price: get( simplePayment, [ 'meta', 'spay_price' ], price || undefined ),
				title: get( simplePayment, [ 'title', 'raw' ], title ),
			} );
		}

		// Validate and save on block-deselect
		if ( prevProps.isSelected && ! isSelected && ! isLoadingInitial ) {
			this.saveProduct();
		}
	}

	attributesToPost = attributes => {
		const { content, currency, email, multiple, price, title } = attributes;

		return {
			content,
			featured_media: 0,
			meta: {
				spay_currency: currency,
				spay_email: email,
				spay_multiple: multiple ? 1 : 0,
				spay_price: price,
			},
			status: 'publish',
			title,
		};
	};

	saveProduct() {
		if ( this.state.isSavingProduct || ! this.props.isValid ) {
			return;
		}

		if ( ! this.validateAttributes() ) {
			return;
		}

		const { attributes, setAttributes } = this.props;
		const { paymentId } = attributes;

		this.setState( { isSavingProduct: true }, () => {
			apiFetch( {
				path: `/wp/v2/${ SIMPLE_PAYMENTS_PRODUCT_POST_TYPE }/${ paymentId ? paymentId : '' }`,
				method: 'POST',
				data: this.attributesToPost( attributes ),
			} )
				.then( response => {
					const { id } = response;

					if ( id ) {
						setAttributes( { paymentId: id } );
					}
				} )
				.catch( error => {
					// @TODO: complete error handling
					// eslint-disable-next-line
					console.error( error );

					const {
						data: { key: apiErrorKey },
					} = error;

					// @TODO errors in other fields
					this.setState( {
						// @TODO: set Formik email invalid
						/*
						fieldEmailError:
							apiErrorKey === 'spay_email'
								? sprintf( __( '%s is not a valid email address.' ), email )
								: null,
						*/
						fieldPriceError: apiErrorKey === 'spay_price' ? __( 'Invalid price.' ) : null,
					} );
				} )
				.finally( () => {
					this.setState( {
						isSavingProduct: false,
					} );
				} );
		} );
	}

	// based on https://stackoverflow.com/a/10454560/59752
	decimalPlaces = number => {
		const match = ( '' + number ).match( /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/ );
		if ( ! match ) {
			return 0;
		}
		return Math.max( 0, ( match[ 1 ] ? match[ 1 ].length : 0 ) - ( match[ 2 ] ? +match[ 2 ] : 0 ) );
	};

	validateAttributes = () => {
		const isPriceValid = this.validatePrice();
		const isTitleValid = this.validateTitle();
		const isCurrencyValid = this.validateCurrency();

		return isPriceValid && isTitleValid && isCurrencyValid;
	};

	/**
	 * Validate currency
	 *
	 * This method does not include validation UI. Currency selection should not allow for invalid
	 * values. It is primarily to ensure that the currency is valid to save.
	 *
	 * @return  {boolean} True if currency is valid
	 */
	validateCurrency = () => {
		const { currency } = this.props.attributes;
		return SUPPORTED_CURRENCY_LIST.includes( currency );
	};

	/**
	 * Validate price
	 *
	 * Stores error message in state.fieldPriceError
	 *
	 * @returns {Boolean} True when valid, false when invalid
	 */
	validatePrice = () => {
		const { currency, price } = this.props.attributes;
		const { precision } = getCurrencyDefaults( currency );

		if ( ! price || parseFloat( price ) === 0 ) {
			this.setState( {
				fieldPriceError: __( 'If you’re selling something, you need a price tag. Add yours here.' ),
			} );
			return false;
		}

		if ( Number.isNaN( parseFloat( price ) ) ) {
			this.setState( {
				fieldPriceError: __( 'Invalid price' ),
			} );
			return false;
		}

		if ( parseFloat( price ) < 0 ) {
			this.setState( {
				fieldPriceError: __(
					'Your price is negative — enter a positive number so people can pay the right amount.'
				),
			} );
			return false;
		}

		if ( this.decimalPlaces( price ) > precision ) {
			if ( precision === 0 ) {
				this.setState( {
					fieldPriceError: __(
						'We know every penny counts, but prices can’t contain decimal values.'
					),
				} );
				return false;
			}

			this.setState( {
				fieldPriceError: sprintf(
					_n(
						'The price cannot have more than %d decimal place.',
						'The price cannot have more than %d decimal places.',
						precision
					),
					precision
				),
			} );
			return false;
		}

		if ( this.state.fieldPriceError ) {
			this.setState( { fieldPriceError: null } );
		}

		return true;
	};

	/**
	 * Validate email
	 *
	 * Stores error message in state.fieldEmailError
	 *
	 * @returns {Boolean} True when valid, false when invalid
	 */
	validateEmail = () => {
		const { email } = this.props.attributes;
		if ( ! email ) {
			this.setState( {
				fieldEmailError: __(
					'We want to make sure payments reach you, so please add an email address.'
				),
			} );
			return false;
		}

		if ( ! emailValidator.validate( email ) ) {
			this.setState( {
				fieldEmailError: sprintf( __( '%s is not a valid email address.' ), email ),
			} );
			return false;
		}

		if ( this.state.fieldEmailError ) {
			this.setState( { fieldEmailError: null } );
		}

		return true;
	};

	/**
	 * Validate title
	 *
	 * Stores error message in state.fieldTitleError
	 *
	 * @returns {Boolean} True when valid, false when invalid
	 */
	validateTitle = () => {
		const { title } = this.props.attributes;
		if ( ! title ) {
			this.setState( {
				fieldTitleError: __(
					'Please add a brief title so that people know what they’re paying for.'
				),
			} );
			return false;
		}

		if ( this.state.fieldTitleError ) {
			this.setState( { fieldTitleError: null } );
		}

		return true;
	};

	handleEmailChange = event => {
		this.props.setFieldValue( 'email', event.target.value );
		this.props.setAttributes( { email: event.target.value } );
	};

	handleContentChange = content => {
		this.props.setAttributes( { content } );
	};

	handlePriceChange = price => {
		price = parseFloat( price );
		if ( ! isNaN( price ) ) {
			this.props.setAttributes( { price } );
		} else {
			this.props.setAttributes( { price: undefined } );
		}
		this.setState( { fieldPriceError: null } );
	};

	handleCurrencyChange = currency => {
		this.props.setAttributes( { currency } );
	};

	handleMultipleChange = multiple => {
		this.props.setAttributes( { multiple: !! multiple } );
	};

	handleTitleChange = title => {
		this.props.setAttributes( { title } );
		this.setState( { fieldTitleError: null } );
	};

	formatPrice = ( price, currency, withSymbol = true ) => {
		const { precision, symbol } = getCurrencyDefaults( currency );
		const value = price.toFixed( precision );
		// Trim the dot at the end of symbol, e.g., 'kr.' becomes 'kr'
		return withSymbol ? `${ value } ${ trimEnd( symbol, '.' ) }` : value;
	};

	getCurrencyList = SUPPORTED_CURRENCY_LIST.map( value => {
		const { symbol } = getCurrencyDefaults( value );
		// if symbol is equal to the code (e.g., 'CHF' === 'CHF'), don't duplicate it.
		// trim the dot at the end, e.g., 'kr.' becomes 'kr'
		const label = symbol === value ? value : `${ value } ${ trimEnd( symbol, '.' ) }`;
		return { value, label };
	} );

	render() {
		const { fieldPriceError, fieldTitleError } = this.state;
		const {
			attributes,
			errors,
			handleBlur,
			instanceId,
			isLoadingInitial,
			isSelected,
			isSubmitting,
			isValid,
			touched,
			values,
		} = this.props;
		const { content, currency, multiple, price, title } = attributes;

		if ( ! isSelected && isLoadingInitial ) {
			return (
				<div className="simple-payments__loading">
					<ProductPlaceholder
						ariaBusy="true"
						content="█████"
						formattedPrice="█████"
						title="█████"
					/>
				</div>
			);
		}

		if ( ! isSelected && ! fieldPriceError && ! fieldTitleError && isValid && price && title ) {
			return (
				<ProductPlaceholder
					ariaBusy="false"
					content={ content }
					formattedPrice={ this.formatPrice( price, currency ) }
					multiple={ multiple }
					title={ title }
				/>
			);
		}

		return (
			<div className="wp-block-jetpack-simple-payments">
				<Fragment>
					<InspectorControls key="inspector">
						<PanelBody>
							<ExternalLink href="https://support.wordpress.com/simple-payments/">
								{ __( 'Support reference' ) }
							</ExternalLink>
						</PanelBody>
					</InspectorControls>

					<TextControl
						aria-describedby={ `${ instanceId }-title-error` }
						className={ classNames( 'simple-payments__field', 'simple-payments__field-title', {
							'simple-payments__field-has-error': fieldTitleError,
						} ) }
						disabled={ isLoadingInitial }
						label={ __( 'Item name' ) }
						onChange={ this.handleTitleChange }
						placeholder={ __( 'Item name' ) }
						required
						type="text"
						value={ title }
					/>
					<HelpMessage id={ `${ instanceId }-title-error` }>{ fieldTitleError }</HelpMessage>

					<TextareaControl
						className="simple-payments__field simple-payments__field-content"
						disabled={ isLoadingInitial }
						label={ __( 'Describe your item in a few words' ) }
						onChange={ this.handleContentChange }
						placeholder={ __( 'Describe your item in a few words' ) }
						value={ content }
					/>

					<div className="simple-payments__price-container">
						<SelectControl
							className="simple-payments__field simple-payments__field-currency"
							disabled={ isLoadingInitial }
							label={ __( 'Currency' ) }
							onChange={ this.handleCurrencyChange }
							options={ this.getCurrencyList }
							value={ currency }
						/>
						<TextControl
							aria-describedby={ `${ instanceId }-price-error` }
							disabled={ isLoadingInitial }
							className={ classNames( 'simple-payments__field', 'simple-payments__field-price', {
								'simple-payments__field-has-error': fieldPriceError,
							} ) }
							label={ __( 'Price' ) }
							onChange={ this.handlePriceChange }
							placeholder={ this.formatPrice( 0, currency, false ) }
							required
							step="1"
							type="number"
							value={ price || '' }
						/>
						<HelpMessage id={ `${ instanceId }-price-error` }>{ fieldPriceError }</HelpMessage>
					</div>

					<div className="simple-payments__field-multiple">
						<ToggleControl
							checked={ Boolean( multiple ) }
							disabled={ isLoadingInitial }
							label={ __( 'Allow people to buy more than one item at a time' ) }
							onChange={ this.handleMultipleChange }
						/>
					</div>

					<Form>
						<BaseControl
							label={ __( 'Email' ) }
							id={ `${ instanceId }-email` }
							className={ classNames( 'simple-payments__field', 'simple-payments__field-email', {
								'simple-payments__field-has-error': errors.email && touched.email,
							} ) }
						>
							<Field
								disabled={ isLoadingInitial || isSubmitting }
								id={ `${ instanceId }-email` }
								name="email"
								onBlur={ handleBlur }
								onChange={ this.handleEmailChange }
								placeholder={ __( 'Email' ) }
								required
								type="email"
								value={ values.email }
							/>
						</BaseControl>

						<ErrorMessage name="email" component={ HelpMessage } />

						<HelpMessage id={ `${ instanceId }-email-help` } isError={ false }>
							{ __(
								'Enter the email address associated with your PayPal account. Don’t have an account?'
							) + ' ' }
							<ExternalLink href="https://www.paypal.com/">
								{ __( 'Create one on PayPal' ) }
							</ExternalLink>
						</HelpMessage>
					</Form>

					{ DisplayFormikState( this.props ) }
				</Fragment>
			</div>
		);
	}
}

const applyWithSelect = withSelect( ( select, props ) => {
	const { paymentId } = props.attributes;
	const { getEntityRecord } = select( 'core' );

	const simplePayment = paymentId
		? getEntityRecord( 'postType', SIMPLE_PAYMENTS_PRODUCT_POST_TYPE, paymentId )
		: undefined;

	return {
		isLoadingInitial: paymentId && ! simplePayment,
		simplePayment,
	};
} );

const validate = values => {
	const errors = {};

	if ( ! values.email ) {
		errors.email = __( 'We want to make sure payments reach you, so please add an email address.' );
	} else if ( ! emailValidator.validate( values.email ) ) {
		errors.email = sprintf( __( '%s is not a valid email address.' ), values.email );
	}

	return errors;
};

const handleSubmit = ( values, { setSubmitting } ) => {
	setTimeout( () => {
		// eslint-disable-next-line
		console.log( 'Submit:', JSON.stringify( values, null, 2 ) );
		setSubmitting( false );
	}, 500 );
};

const mapPropsToValues = ( { attributes } ) => ( {
	email: attributes.email,
} );

const formikEnhancer = withFormik( {
	validate,
	mapPropsToValues,
	handleSubmit,
	// Find the component in React DevTools by this name
	displayName: 'SimplePaymentForm',
} );

export default compose( [ applyWithSelect, withInstanceId, formikEnhancer ] )( SimplePaymentsEdit );
