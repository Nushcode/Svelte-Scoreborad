
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
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
        else
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
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
    function createEventDispatcher() {
        const component = current_component;
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
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
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
                binding_callbacks.shift()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            while (render_callbacks.length) {
                const callback = render_callbacks.pop();
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_render);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_render.forEach(add_render_callback);
        }
    }
    let outros;
    function group_outros() {
        outros = {
            remaining: 0,
            callbacks: []
        };
    }
    function check_outros() {
        if (!outros.remaining) {
            run_all(outros.callbacks);
        }
    }
    function on_outro(callback) {
        outros.callbacks.push(callback);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_render } = component.$$;
        fragment.m(target, anchor);
        // onMount happens after the initial afterUpdate. Because
        // afterUpdate callbacks happen in reverse order (inner first)
        // we schedule onMount callbacks before afterUpdate callbacks
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
        after_render.forEach(add_render_callback);
    }
    function destroy(component, detaching) {
        if (component.$$) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal: not_equal$$1,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_render: [],
            after_render: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_render);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                $$.fragment.l(children(options.target));
            }
            else {
                $$.fragment.c();
            }
            if (options.intro && component.$$.fragment.i)
                component.$$.fragment.i();
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy(this, true);
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

    /* src\Navbar.svelte generated by Svelte v3.4.4 */

    const file = "src\\Navbar.svelte";

    function create_fragment(ctx) {
    	var div, h1;

    	return {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Player Scoreboard";
    			add_location(h1, file, 1, 2, 35);
    			div.className = "navbar bg-primary";
    			add_location(div, file, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    	}
    }

    /* src\Player.svelte generated by Svelte v3.4.4 */

    const file$1 = "src\\Player.svelte";

    // (30:25) {:else}
    function create_else_block(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("+");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (30:6) {#if showControls}
    function create_if_block_1(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("-");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (35:2) {#if showControls}
    function create_if_block(ctx) {
    	var button0, t1, button1, t3, input, dispose;

    	return {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "+1";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "-1";
    			t3 = space();
    			input = element("input");
    			button0.className = "btn";
    			add_location(button0, file$1, 35, 4, 792);
    			button1.className = "btn btn-dark";
    			add_location(button1, file$1, 36, 4, 849);
    			attr(input, "type", "number");
    			add_location(input, file$1, 37, 4, 918);

    			dispose = [
    				listen(button0, "click", ctx.addPoint),
    				listen(button1, "click", ctx.removePoint),
    				listen(input, "input", ctx.input_input_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, button0, anchor);
    			insert(target, t1, anchor);
    			insert(target, button1, anchor);
    			insert(target, t3, anchor);
    			insert(target, input, anchor);

    			input.value = ctx.points;
    		},

    		p: function update(changed, ctx) {
    			if (changed.points) input.value = ctx.points;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button0);
    				detach(t1);
    				detach(button1);
    				detach(t3);
    				detach(input);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var div, h1, t0, t1, button0, t2, button1, t4, h3, t5, t6, t7, dispose;

    	function select_block_type(ctx) {
    		if (ctx.showControls) return create_if_block_1;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.showControls) && create_if_block(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(ctx.name);
    			t1 = space();
    			button0 = element("button");
    			if_block0.c();
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "x";
    			t4 = space();
    			h3 = element("h3");
    			t5 = text("Points: ");
    			t6 = text(ctx.points);
    			t7 = space();
    			if (if_block1) if_block1.c();
    			button0.className = "btn btn-sm";
    			add_location(button0, file$1, 28, 4, 544);
    			button1.className = "btn btn-danger btn-sm";
    			add_location(button1, file$1, 31, 4, 658);
    			h1.className = "svelte-1r28t19";
    			add_location(h1, file$1, 26, 2, 521);
    			h3.className = "svelte-1r28t19";
    			add_location(h3, file$1, 33, 2, 739);
    			div.className = "card";
    			add_location(div, file$1, 25, 0, 499);

    			dispose = [
    				listen(button0, "click", ctx.toggleControls),
    				listen(button1, "click", ctx.onDelete)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, button0);
    			if_block0.m(button0, null);
    			append(h1, t2);
    			append(h1, button1);
    			append(div, t4);
    			append(div, h3);
    			append(h3, t5);
    			append(h3, t6);
    			append(div, t7);
    			if (if_block1) if_block1.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data(t0, ctx.name);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(button0, null);
    				}
    			}

    			if (changed.points) {
    				set_data(t6, ctx.points);
    			}

    			if (ctx.showControls) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      let { name, points } = $$props;
      let showControls = false;

      const addPoint = () => { const $$result = (points += 1); $$invalidate('points', points); return $$result; };
      const removePoint = () => { const $$result = (points -= 1); $$invalidate('points', points); return $$result; };
      const toggleControls = () => { const $$result = (showControls = !showControls); $$invalidate('showControls', showControls); return $$result; };
      const onDelete = () => dispatch("removeplayer", name);

    	const writable_props = ['name', 'points'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Player> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		points = to_number(this.value);
    		$$invalidate('points', points);
    	}

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('points' in $$props) $$invalidate('points', points = $$props.points);
    	};

    	return {
    		name,
    		points,
    		showControls,
    		addPoint,
    		removePoint,
    		toggleControls,
    		onDelete,
    		input_input_handler
    	};
    }

    class Player extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, ["name", "points"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Player> was created without expected prop 'name'");
    		}
    		if (ctx.points === undefined && !('points' in props)) {
    			console.warn("<Player> was created without expected prop 'points'");
    		}
    	}

    	get name() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get points() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set points(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\AddPlayer.svelte generated by Svelte v3.4.4 */

    const file$2 = "src\\AddPlayer.svelte";

    function create_fragment$2(ctx) {
    	var form, input0, t0, input1, t1, input2, dispose;

    	return {
    		c: function create() {
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			input2 = element("input");
    			attr(input0, "type", "text");
    			input0.placeholder = "Player Name";
    			add_location(input0, file$2, 21, 2, 377);
    			attr(input1, "type", "number");
    			input1.placeholder = "Player Points";
    			add_location(input1, file$2, 22, 2, 453);
    			attr(input2, "type", "submit");
    			input2.className = "btn btn-primary";
    			input2.value = "Add Player";
    			add_location(input2, file$2, 23, 2, 535);
    			form.className = "grid-3";
    			add_location(form, file$2, 20, 0, 331);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(form, "submit", ctx.onSubmit)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, form, anchor);
    			append(form, input0);

    			input0.value = ctx.player.name;

    			append(form, t0);
    			append(form, input1);

    			input1.value = ctx.player.points;

    			append(form, t1);
    			append(form, input2);
    		},

    		p: function update(changed, ctx) {
    			if (changed.player && (input0.value !== ctx.player.name)) input0.value = ctx.player.name;
    			if (changed.player) input1.value = ctx.player.points;
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(form);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      let player = {
        name: "",
        points: 0
      };

      const onSubmit = e => {
        e.preventDefault();
        dispatch("addplayer", player);
        $$invalidate('player', player = {
          name: "",
          points: 0
        });
      };

    	function input0_input_handler() {
    		player.name = this.value;
    		$$invalidate('player', player);
    	}

    	function input1_input_handler() {
    		player.points = to_number(this.value);
    		$$invalidate('player', player);
    	}

    	return {
    		player,
    		onSubmit,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class AddPlayer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.4.4 */

    const file$3 = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.player = list[i];
    	return child_ctx;
    }

    // (32:2) {:else}
    function create_else_block$1(ctx) {
    	var each_1_anchor, current;

    	var each_value = ctx.players;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.players || changed.removePlayer) {
    				each_value = ctx.players;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (30:2) {#if players.length === 0}
    function create_if_block$1(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No Players";
    			add_location(p, file$3, 30, 4, 618);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (33:4) {#each players as player}
    function create_each_block(ctx) {
    	var current;

    	var player = new Player({
    		props: { name: ctx.player.name, points: ctx.player.points },
    		$$inline: true
    	});
    	player.$on("removeplayer", ctx.removePlayer);

    	return {
    		c: function create() {
    			player.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(player, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var player_changes = {};
    			if (changed.players) player_changes.name = ctx.player.name;
    			if (changed.players) player_changes.points = ctx.player.points;
    			player.$set(player_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			player.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			player.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			player.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var t0, div, t1, current_block_type_index, if_block, current;

    	var navbar = new Navbar({ $$inline: true });

    	var addplayer = new AddPlayer({ $$inline: true });
    	addplayer.$on("addplayer", ctx.addPlayer);

    	var if_block_creators = [
    		create_if_block$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.players.length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			navbar.$$.fragment.c();
    			t0 = space();
    			div = element("div");
    			addplayer.$$.fragment.c();
    			t1 = space();
    			if_block.c();
    			div.className = "container";
    			add_location(div, file$3, 27, 0, 517);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			mount_component(addplayer, div, null);
    			append(div, t1);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				on_outro(() => {
    					if_blocks[previous_block_index].d(1);
    					if_blocks[previous_block_index] = null;
    				});
    				if_block.o(1);
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				if_block.i(1);
    				if_block.m(div, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			navbar.$$.fragment.i(local);

    			addplayer.$$.fragment.i(local);

    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			navbar.$$.fragment.o(local);
    			addplayer.$$.fragment.o(local);
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			navbar.$destroy(detaching);

    			if (detaching) {
    				detach(t0);
    				detach(div);
    			}

    			addplayer.$destroy();

    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let players = [
        {
          name: "Aayush",
          points: 53
        },
        {
          name: "Shreya",
          points: 45
        }
      ];

      const addPlayer = e => {
        const newPlayer = e.detail;
        $$invalidate('players', players = [...players, newPlayer]);
      };

      const removePlayer = e => {
        $$invalidate('players', players = players.filter(player => player.name !== e.detail));
      };

    	return { players, addPlayer, removePlayer };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body,
      props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
