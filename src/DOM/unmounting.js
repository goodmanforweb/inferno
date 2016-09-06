import {
	isNullOrUndef,
	isArray,
	isNull,
	isInvalid,
	isFunction,
	throwError
} from './../core/utils';
import { removeChild } from './utils';
import { componentToDOMNodeMap } from './rendering';
import {
	isOptVElement,
	isVComponent,
	isVElement,
	isVText,
	isVPlaceholder,
	isVFragment,
	ValueTypes
} from '../core/shapes';
import { poolOptVElement, poolVComponent, recyclingEnabled } from './recycling';

export function unmount(input, parentDom, lifecycle, canRecycle) {
	if (!isInvalid(input)) {
		if (isOptVElement(input)) {
			unmountOptVElement(input, parentDom, lifecycle, canRecycle);
		} else if (isVComponent(input)) {
			unmountVComponent(input, parentDom, lifecycle, canRecycle);
		} else if (isVElement(input)) {
			unmountVElement(input, parentDom, lifecycle);
		} else if (isVFragment(input)) {
			unmountVFragment(input, parentDom, true, lifecycle);
		} else if (isVText(input)) {
			unmountVText(input, parentDom);
		} else if (isVPlaceholder(input)) {
			unmountVPlaceholder(input, parentDom);
		}
	}
}

function unmountVPlaceholder(vPlaceholder, parentDom) {
	if (parentDom) {
		removeChild(parentDom, vPlaceholder.dom);
	}
}

function unmountVText(vText, parentDom) {
	if (parentDom) {
		removeChild(parentDom, vText.dom);
	}
}

function unmountOptVElement(optVElement, parentDom, lifecycle, canRecycle) {
	const bp = optVElement.bp;
	const bp0 = bp.v0;
	const dom = bp.dom;

	if (!isNull(bp0)) {
		unmountOptVElementValue(optVElement, bp0, optVElement.v0, dom, lifecycle);
		const bp1 = bp.v1;

		if (!isNull(bp1)) {
			unmountOptVElementValue(optVElement, bp1, optVElement.v1, dom, lifecycle);
			const bp2 = bp.v2;

			if (!isNull(bp2)) {
				unmountOptVElementValue(optVElement, bp2, optVElement.v2, dom, lifecycle);
			}
		}
	}
	if (!isNull(parentDom)) {
		parentDom.removeChild(optVElement.dom);
	}
	if (recyclingEnabled && (parentDom || canRecycle)) {
		poolOptVElement(optVElement);
	}
}

function unmountOptVElementValue(optVElement, valueType, value, dom, lifecycle) {
	switch (valueType) {
		case ValueTypes.CHILDREN:
			unmountChildren(value, dom, lifecycle);
			break;
		case ValueTypes.PROP_REF:
			unmountRef(value);
			break;
		case ValueTypes.PROP_SPREAD:
			unmountProps(value, dom, lifecycle);
			break;
	}
}

export function unmountVFragment(vFragment, parentDom, removePointer, lifecycle) {
	const children = vFragment.children;
	const childrenLength = children.length;
	const pointer = vFragment.pointer;

	if (childrenLength > 0) {
		for (let i = 0; i < childrenLength; i++) {
			const child = children[i];

			if (isVFragment(child)) {
				unmountVFragment(child, parentDom, true, lifecycle, false);
			} else {
				unmount(child, parentDom, lifecycle, false);
			}
		}
	}
	if (parentDom && removePointer) {
		removeChild(parentDom, pointer);
	}
}

export function unmountVComponent(vComponent, parentDom, lifecycle, canRecycle) {
	const instance = vComponent.instance;
	let instanceHooks = null;
	let instanceChildren = null;

	if (!isNullOrUndef(instance)) {
		const ref = vComponent.ref;

		if (ref) {
			ref(null);
		}
		instanceHooks = instance.hooks;
		instanceChildren = instance.children;
		if (instance.render !== undefined) {
			instance.componentWillUnmount();
			instance._unmounted = true;
			componentToDOMNodeMap.delete(instance);
			unmount(instance._lastInput, null, lifecycle, false);
		} else {
			unmount(instance, null, lifecycle, false);
		}
	}
	const hooks = vComponent.hooks || instanceHooks;

	if (!isNullOrUndef(hooks)) {
		if (!isNullOrUndef(hooks.onComponentWillUnmount)) {
			hooks.onComponentWillUnmount(hooks);
		}
	}
	if (parentDom) {
		removeChild(parentDom, vComponent.dom);
	}
	if (recyclingEnabled && (parentDom || canRecycle)) {
		poolVComponent(vComponent);
	}
}

export function unmountVElement(vElement, parentDom, lifecycle) {
	const hooks = vElement.hooks;
	const dom = vElement.dom;
	const ref = vElement.ref;

	if (ref) {
		unmountRef(ref);
	}
	const children = vElement.children;

	if (!isNullOrUndef(children)) {
		unmountChildren(children, lifecycle);
	}
	if (parentDom) {
		removeChild(parentDom, dom);
	}
}

function unmountChildren(children, lifecycle) {
	if (isArray(children)) {
		for (let i = 0; i < children.length; i++) {
			unmount(children[i], null, lifecycle, false);
		}
	} else {
		unmount(children, null, lifecycle, false);
	}
}

function unmountRef(ref) {
	if (isFunction(ref)) {
		ref(null);
	} else {
		if (process.env.NODE_ENV !== 'production') {
			throwError('string "refs" are not supported in Inferno 0.8+. Use callback "refs" instead.');
		}
		throwError();
	}
}

function unmountProps(props, dom, lifecycle) {
	for (let prop in props) {
		const value = props[prop];

		if (prop === 'ref') {
			unmountRef(value);
		}
	}
}
