/*global ko, Router */
(function () {
	'use strict';

	// represent a single todo item
	var Todo = function (title, completed) {
		this.title = ko.observable(title);
		this.completed = ko.observable(completed);
		this.editing = ko.observable(false);
	};

	// our main view model
	var ViewModel = function (todos) {
		// map array of passed in todos to an observableArray of Todo objects
		this.todos = ko.observableArray(todos.map(function (todo) {
			return new Todo(todo.title, todo.completed);
		}));

		// store the new todo value being entered
		this.current = ko.observable();

		this.showMode = ko.observable('all');

		this.filteredTodos = ko.computed(function () {
			switch (this.showMode()) {
			case 'active':
				return this.todos().filter(function (todo) {
					return !todo.completed();
				});
			case 'completed':
				return this.todos().filter(function (todo) {
					return todo.completed();
				});
			default:
				return this.todos();
			}
		}.bind(this));

		// add a new todo, when enter key is pressed
		this.add = function () {
			var current = this.current().trim();
			if (current) {
				this.todos.push(new Todo(current));
				this.current('');
			}
		}.bind(this);

		// remove a single todo
		this.remove = function (todo) {
			this.todos.remove(todo);
		}.bind(this);

		// remove all completed todos
		this.removeCompleted = function () {
			this.todos.remove(function (todo) {
				return todo.completed();
			});
		}.bind(this);

		// edit an item
		this.editItem = function (item) {
			item.editing(true);
			item.previousTitle = item.title();
		}.bind(this);

		// stop editing an item.  Remove the item, if it is now empty
		this.saveEditing = function (item) {
			item.editing(false);

			var title = item.title();
			var trimmedTitle = title.trim();

			// Observable value changes are not triggered if they're consisting of whitespaces only
			// Therefore we've to compare untrimmed version with a trimmed one to chech whether anything changed
			// And if yes, we've to set the new value manually
			if (title !== trimmedTitle) {
				item.title(trimmedTitle);
			}

			if (!trimmedTitle) {
				this.remove(item);
			}
		}.bind(this);

		// cancel editing an item and revert to the previous content
		this.cancelEditing = function (item) {
			item.editing(false);
			item.title(item.previousTitle);
		}.bind(this);

		// count of all completed todos
		this.completedCount = ko.computed(function () {
			return this.todos().filter(function (todo) {
				return todo.completed();
			}).length;
		}.bind(this));

		// count of todos that are not complete
		this.remainingCount = ko.computed(function () {
			return this.todos().length - this.completedCount();
		}.bind(this));

		// writeable computed observable to handle marking all complete/incomplete
		this.allCompleted = ko.computed({
			//always return true/false based on the done flag of all todos
			read: function () {
				return !this.remainingCount();
			}.bind(this),
			// set all todos to the written value (true/false)
			write: function (newValue) {
				this.todos().forEach(function (todo) {
					// set even if value is the same, as subscribers are not notified in that case
					todo.completed(newValue);
				});
			}.bind(this)
		});

		// helper function to keep expressions out of markup
		this.getLabel = function (count) {
			return ko.utils.unwrapObservable(count) === 1 ? 'item' : 'items';
		}.bind(this);

		// internal computed observable that fires whenever anything changes in our todos
		ko.computed(function () {
			// store a clean copy to local storage, which also creates a dependency on the observableArray and all observables in each item
			localStorage.setItem('todos-knockoutjs', ko.toJSON(this.todos));
		}.bind(this)).extend({
			rateLimit: { timeout: 500, method: 'notifyWhenChangesStop' }
		}); // save at most twice per second
	};

	// check local storage for todos
	var todos = ko.utils.parseJson(localStorage.getItem('todos-knockoutjs'));

	// bind a new instance of our view model to the page
	var viewModel = new ViewModel(todos || []);
	ko.applyBindings(viewModel);

	// set up filter routing
	/*jshint newcap:false */
	Router({
		'/:filter': viewModel.showMode
	}).init();
}());
