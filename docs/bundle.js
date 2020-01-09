
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src\Switcher.svelte generated by Svelte v3.16.7 */
    const file = "src\\Switcher.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (140:3) {#each data as item }
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*item*/ ctx[15] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-k6fg09");
    			add_location(li, file, 140, 5, 3377);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*item*/ ctx[15] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(140:3) {#each data as item }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let ul;
    	let dispose;
    	let each_value = /*data*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "touch-time-container svelte-k6fg09");
    			add_location(ul, file, 138, 2, 3287);
    			attr_dev(div, "class", "touch-time-wrapper svelte-k6fg09");
    			add_location(div, file, 137, 0, 3196);

    			dispose = [
    				listen_dev(div, "mousedown", /*onMouseDown*/ ctx[2], false, false, false),
    				listen_dev(div, "touchstart", /*onMouseDown*/ ctx[2], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			/*ul_binding*/ ctx[14](ul);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1) {
    				each_value = /*data*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			/*ul_binding*/ ctx[14](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { selected } = $$props;
    	let { data = 0 } = $$props;
    	let { type } = $$props;
    	let position = selected ? -(selected - 1) * 50 : 0;
    	let offset = 0;
    	let dragging = false;
    	let itemWrapper, previousY;

    	onMount(() => {
    		setPosition();
    	});

    	afterUpdate(() => {
    		let selectedPosition = -(selected - 1) * 50;

    		if (!dragging && position !== selectedPosition) {
    			position = selectedPosition;
    			setPosition();
    		}
    	});

    	function onDateChange(type, changedData) {
    		dispatch("dateChange", { type, changedData });
    	}

    	function setPosition() {
    		let itemPosition = `
      will-change: 'transform';
      transition: transform ${Math.abs(offset) / 100 + 0.1}s;
      transform: translateY(${position}px)
    `;

    		$$invalidate(1, itemWrapper.style.cssText = itemPosition, itemWrapper);
    	}

    	let onMouseDown = event => {
    		previousY = event.touches ? event.touches[0].clientY : event.clientY;
    		dragging = true;
    		window.addEventListener("mousemove", onMouseMove);
    		window.addEventListener("mouseup", onMouseUp);
    		window.addEventListener("touchmove", onMouseMove);
    		window.addEventListener("touchend", onMouseUp);
    	};

    	let onMouseMove = event => {
    		let clientY = event.touches ? event.touches[0].clientY : event.clientY;
    		offset = clientY - previousY;
    		let maxPosition = -data.length * 50;
    		let _position = position + offset;
    		position = Math.max(maxPosition, Math.min(50, _position));
    		previousY = event.touches ? event.touches[0].clientY : event.clientY;
    		setPosition();
    	};

    	let onMouseUp = () => {
    		let maxPosition = -(data.length - 1) * 50;
    		let rounderPosition = Math.round((position + offset * 5) / 50) * 50;
    		let finalPosition = Math.max(maxPosition, Math.min(0, rounderPosition));
    		dragging = false;
    		position = finalPosition;
    		window.removeEventListener("mousemove", onMouseMove);
    		window.removeEventListener("mouseup", onMouseUp);
    		window.removeEventListener("touchmove", onMouseMove);
    		window.removeEventListener("touchend", onMouseUp);
    		setPosition();
    		onDateChange(type, -finalPosition / 50);
    	};

    	const writable_props = ["selected", "data", "type"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Switcher> was created with unknown prop '${key}'`);
    	});

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, itemWrapper = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("selected" in $$props) $$invalidate(3, selected = $$props.selected);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("type" in $$props) $$invalidate(4, type = $$props.type);
    	};

    	$$self.$capture_state = () => {
    		return {
    			selected,
    			data,
    			type,
    			position,
    			offset,
    			dragging,
    			itemWrapper,
    			previousY,
    			onMouseDown,
    			onMouseMove,
    			onMouseUp
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("selected" in $$props) $$invalidate(3, selected = $$props.selected);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("type" in $$props) $$invalidate(4, type = $$props.type);
    		if ("position" in $$props) position = $$props.position;
    		if ("offset" in $$props) offset = $$props.offset;
    		if ("dragging" in $$props) dragging = $$props.dragging;
    		if ("itemWrapper" in $$props) $$invalidate(1, itemWrapper = $$props.itemWrapper);
    		if ("previousY" in $$props) previousY = $$props.previousY;
    		if ("onMouseDown" in $$props) $$invalidate(2, onMouseDown = $$props.onMouseDown);
    		if ("onMouseMove" in $$props) onMouseMove = $$props.onMouseMove;
    		if ("onMouseUp" in $$props) onMouseUp = $$props.onMouseUp;
    	};

    	return [
    		data,
    		itemWrapper,
    		onMouseDown,
    		selected,
    		type,
    		position,
    		offset,
    		dragging,
    		previousY,
    		dispatch,
    		onDateChange,
    		setPosition,
    		onMouseMove,
    		onMouseUp,
    		ul_binding
    	];
    }

    class Switcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { selected: 3, data: 0, type: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Switcher",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*selected*/ ctx[3] === undefined && !("selected" in props)) {
    			console.warn("<Switcher> was created without expected prop 'selected'");
    		}

    		if (/*type*/ ctx[4] === undefined && !("type" in props)) {
    			console.warn("<Switcher> was created without expected prop 'type'");
    		}
    	}

    	get selected() {
    		throw new Error("<Switcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<Switcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Switcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Switcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Switcher>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Switcher>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\TimePicker.svelte generated by Svelte v3.16.7 */
    const file$1 = "src\\TimePicker.svelte";

    // (104:0) {#if visible}
    function create_if_block(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let t4;
    	let div2;
    	let button0;
    	let t6;
    	let button1;
    	let current;
    	let dispose;

    	const switcher0 = new Switcher({
    			props: {
    				type: "hours",
    				data: /*HOURS*/ ctx[5],
    				selected: /*selectedHour*/ ctx[2],
    				"}": true
    			},
    			$$inline: true
    		});

    	switcher0.$on("timeChange", /*timeChanged*/ ctx[9]);

    	const switcher1 = new Switcher({
    			props: {
    				type: "minutes",
    				data: /*MINUTES*/ ctx[6],
    				selected: /*time*/ ctx[0].getMinutes()
    			},
    			$$inline: true
    		});

    	switcher1.$on("timeChange", /*timeChanged*/ ctx[9]);

    	const switcher2 = new Switcher({
    			props: {
    				type: "meridiem",
    				data: /*MERIDIEM*/ ctx[7],
    				selected: /*selectedMeridiem*/ ctx[3]
    			},
    			$$inline: true
    		});

    	switcher2.$on("timeChange", /*timeChanged*/ ctx[9]);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text(/*_time*/ ctx[1]);
    			t1 = space();
    			div1 = element("div");
    			create_component(switcher0.$$.fragment);
    			t2 = space();
    			create_component(switcher1.$$.fragment);
    			t3 = space();
    			create_component(switcher2.$$.fragment);
    			t4 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Reset";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Ok";
    			attr_dev(div0, "class", "touch-time svelte-1onxm3v");
    			add_location(div0, file$1, 107, 10, 2504);
    			attr_dev(div1, "class", "touch-time-picker svelte-1onxm3v");
    			add_location(div1, file$1, 108, 10, 2553);
    			attr_dev(button0, "class", "svelte-1onxm3v");
    			add_location(button0, file$1, 114, 10, 2985);
    			attr_dev(button1, "class", "svelte-1onxm3v");
    			add_location(button1, file$1, 115, 10, 3040);
    			attr_dev(div2, "class", "touch-time-reset svelte-1onxm3v");
    			add_location(div2, file$1, 113, 8, 2943);
    			attr_dev(div3, "class", "touch-time-wrapper svelte-1onxm3v");
    			add_location(div3, file$1, 106, 6, 2460);
    			attr_dev(div4, "class", "svelte-1onxm3v");
    			add_location(div4, file$1, 105, 4, 2447);
    			attr_dev(div5, "class", "touch-time-popup svelte-1onxm3v");
    			add_location(div5, file$1, 104, 2, 2410);

    			dispose = [
    				listen_dev(button0, "click", /*resetTime*/ ctx[8], false, false, false),
    				listen_dev(button1, "click", /*click_handler*/ ctx[11], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			mount_component(switcher0, div1, null);
    			append_dev(div1, t2);
    			mount_component(switcher1, div1, null);
    			append_dev(div1, t3);
    			mount_component(switcher2, div1, null);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t6);
    			append_dev(div2, button1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*_time*/ 2) set_data_dev(t0, /*_time*/ ctx[1]);
    			const switcher0_changes = {};
    			if (dirty & /*selectedHour*/ 4) switcher0_changes.selected = /*selectedHour*/ ctx[2];
    			switcher0.$set(switcher0_changes);
    			const switcher1_changes = {};
    			if (dirty & /*time*/ 1) switcher1_changes.selected = /*time*/ ctx[0].getMinutes();
    			switcher1.$set(switcher1_changes);
    			const switcher2_changes = {};
    			if (dirty & /*selectedMeridiem*/ 8) switcher2_changes.selected = /*selectedMeridiem*/ ctx[3];
    			switcher2.$set(switcher2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(switcher0.$$.fragment, local);
    			transition_in(switcher1.$$.fragment, local);
    			transition_in(switcher2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(switcher0.$$.fragment, local);
    			transition_out(switcher1.$$.fragment, local);
    			transition_out(switcher2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(switcher0);
    			destroy_component(switcher1);
    			destroy_component(switcher2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(104:0) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let input;
    	let t;
    	let if_block_anchor;
    	let current;
    	let dispose;
    	let if_block = /*visible*/ ctx[4] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(input, "type", "text");
    			input.readOnly = true;
    			input.value = /*_time*/ ctx[1];
    			add_location(input, file$1, 102, 0, 2311);
    			dispose = listen_dev(input, "focus", /*focus_handler*/ ctx[10], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*_time*/ 2) {
    				prop_dev(input, "value", /*_time*/ ctx[1]);
    			}

    			if (/*visible*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const HOURS = new Array(12).fill(1).map((v, i) => v + i);
    	const MINUTES = new Array(59).fill(1).map((v, i) => v + i);
    	const MERIDIEM = ["AM", "PM"];
    	let { time = new Date() } = $$props;

    	let { _time } = $$props,
    		{ selectedHour } = $$props,
    		{ selectedMeridiem } = $$props;

    	let { visible = false } = $$props;

    	let resetTime = event => {
    		event.stopPropagation();
    		$$invalidate(0, time = new Date());
    	};

    	let timeChanged = event => {
    		let { type, changedData } = event.detail;
    		let newTime = new Date();

    		if (type === "hours") {
    			let thresholdHour = selectedMeridiem === 2 ? 13 : 1;
    			newTime.setHours(changedData + thresholdHour);
    			newTime.setMinutes(time.getMinutes());
    		} else if (type === "minutes") {
    			newTime.setHours(time.getHours());
    			newTime.setMinutes(changedData + 1);
    		} else if (type === "meridiem") {
    			let thresholdHour = ~~changedData ? 12 : ~11;
    			newTime.setHours(time.getHours() + thresholdHour);
    			newTime.setMinutes(time.getMinutes());
    		}

    		$$invalidate(0, time = newTime);
    	};

    	const writable_props = ["time", "_time", "selectedHour", "selectedMeridiem", "visible"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TimePicker> was created with unknown prop '${key}'`);
    	});

    	const focus_handler = () => {
    		$$invalidate(4, visible = !visible);
    	};

    	const click_handler = () => {
    		$$invalidate(4, visible = !visible);
    	};

    	$$self.$set = $$props => {
    		if ("time" in $$props) $$invalidate(0, time = $$props.time);
    		if ("_time" in $$props) $$invalidate(1, _time = $$props._time);
    		if ("selectedHour" in $$props) $$invalidate(2, selectedHour = $$props.selectedHour);
    		if ("selectedMeridiem" in $$props) $$invalidate(3, selectedMeridiem = $$props.selectedMeridiem);
    		if ("visible" in $$props) $$invalidate(4, visible = $$props.visible);
    	};

    	$$self.$capture_state = () => {
    		return {
    			time,
    			_time,
    			selectedHour,
    			selectedMeridiem,
    			visible,
    			resetTime,
    			timeChanged
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("time" in $$props) $$invalidate(0, time = $$props.time);
    		if ("_time" in $$props) $$invalidate(1, _time = $$props._time);
    		if ("selectedHour" in $$props) $$invalidate(2, selectedHour = $$props.selectedHour);
    		if ("selectedMeridiem" in $$props) $$invalidate(3, selectedMeridiem = $$props.selectedMeridiem);
    		if ("visible" in $$props) $$invalidate(4, visible = $$props.visible);
    		if ("resetTime" in $$props) $$invalidate(8, resetTime = $$props.resetTime);
    		if ("timeChanged" in $$props) $$invalidate(9, timeChanged = $$props.timeChanged);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 1) {
    			 {
    				$$invalidate(1, _time = time.toLocaleTimeString("en-US", { timeStyle: "short" }));
    				$$invalidate(2, selectedHour = +time.toLocaleTimeString("en-us", { hour12: true, hour: "numeric" }).split(" ")[0]);
    				$$invalidate(3, selectedMeridiem = time.getHours() < 12 ? 1 : 2);
    			}
    		}
    	};

    	return [
    		time,
    		_time,
    		selectedHour,
    		selectedMeridiem,
    		visible,
    		HOURS,
    		MINUTES,
    		MERIDIEM,
    		resetTime,
    		timeChanged,
    		focus_handler,
    		click_handler
    	];
    }

    class TimePicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			time: 0,
    			_time: 1,
    			selectedHour: 2,
    			selectedMeridiem: 3,
    			visible: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimePicker",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*_time*/ ctx[1] === undefined && !("_time" in props)) {
    			console.warn("<TimePicker> was created without expected prop '_time'");
    		}

    		if (/*selectedHour*/ ctx[2] === undefined && !("selectedHour" in props)) {
    			console.warn("<TimePicker> was created without expected prop 'selectedHour'");
    		}

    		if (/*selectedMeridiem*/ ctx[3] === undefined && !("selectedMeridiem" in props)) {
    			console.warn("<TimePicker> was created without expected prop 'selectedMeridiem'");
    		}
    	}

    	get time() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set time(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get _time() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set _time(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectedHour() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedHour(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectedMeridiem() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedMeridiem(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<TimePicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<TimePicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* dev\App.svelte generated by Svelte v3.16.7 */
    const file$2 = "dev\\App.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let updating_time;
    	let current;

    	function timepicker_time_binding(value) {
    		/*timepicker_time_binding*/ ctx[2].call(null, value);
    	}

    	let timepicker_props = {};

    	if (/*time*/ ctx[0] !== void 0) {
    		timepicker_props.time = /*time*/ ctx[0];
    	}

    	const timepicker = new TimePicker({ props: timepicker_props, $$inline: true });
    	binding_callbacks.push(() => bind(timepicker, "time", timepicker_time_binding));

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t0 = text("Time: ");
    			t1 = text(/*_time*/ ctx[1]);
    			t2 = space();
    			create_component(timepicker.$$.fragment);
    			add_location(p, file$2, 41, 4, 672);
    			attr_dev(div0, "class", "center svelte-l7173y");
    			add_location(div0, file$2, 40, 2, 646);
    			attr_dev(div1, "class", "container svelte-l7173y");
    			add_location(div1, file$2, 39, 0, 618);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(div0, t2);
    			mount_component(timepicker, div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*_time*/ 2) set_data_dev(t1, /*_time*/ ctx[1]);
    			const timepicker_changes = {};

    			if (!updating_time && dirty & /*time*/ 1) {
    				updating_time = true;
    				timepicker_changes.time = /*time*/ ctx[0];
    				add_flush_callback(() => updating_time = false);
    			}

    			timepicker.$set(timepicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timepicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timepicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(timepicker);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let time = new Date();

    	function timepicker_time_binding(value) {
    		time = value;
    		$$invalidate(0, time);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("time" in $$props) $$invalidate(0, time = $$props.time);
    		if ("_time" in $$props) $$invalidate(1, _time = $$props._time);
    	};

    	let _time;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 1) {
    			 $$invalidate(1, _time = time.toLocaleTimeString("en-US"));
    		}
    	};

    	return [time, _time, timepicker_time_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
