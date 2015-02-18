/*
 * Copyright (c) 2011-2013 Lp digital system
 *
 * This file is part of BackBuilder5.
 *
 * BackBuilder5 is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BackBuilder5 is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BackBuilder5. If not, see <http://www.gnu.org/licenses/>.
 */

define(
    ['tb.core', 'tb.core.Renderer', 'user/entity/user', 'component!notify', 'require'],
    function (Core, renderer, User, Notify, require) {
        'use strict';

        Core.ControllerManager.registerController('UserController', {

            appName: 'user',

            config: {
                imports: ['user/repository/user.repository'],
                define: {
                    indexService: ['user/views/user/view.list', 'text!user/templates/user/list.twig'],
                    newService: ['user/views/user/form.view', 'user/form/new.user.form'],
                    editService:  ['user/views/user/form.view', 'user/form/edit.user.form'],
                    deleteService: ['user/views/user/delete.view']
                }
            },

            onInit: function (req) {
                this.repository = req('user/repository/user.repository');
            },

            /**
             * Index action
             * Show the index in the edit contribution toolbar
             */
            indexService: function (req, popin) {
                var View = req('user/views/user/view.list'),
                    template = req('text!user/templates/user/list.twig');

                this.repository.paginate().then(
                    function (users) {
                        var i,
                            user;

                        for (i = users.length - 1; i >= 0; i = i - 1) {
                            user = new User();
                            user.populate(users[i]);
                            users[i] = new View({user: user});
                        }

                        popin.addUsers(renderer.render(template, {users: users}));
                    },
                    function () {
                        popin.addUsers('');
                        Core.exception.silent('UserControllerEception', 500, 'User REST paginate call fail');
                    }
                );
            },

            initFormView: function (user, popin, View, action) {
                var self = this,
                    view = new View({popin: popin, user: user}, action);

                view.display().then(function (user) {

                    self.repository.save(user.getObject()).then(
                        function () {
                            popin.popinManager.destroy(view.popin);
                            self.indexService(require, popin);
                            Notify.success('User save success.');
                        },
                        function () {
                            Notify.error('User save fail.');
                        }
                    );
                });
            },

            newService: function (req, popin) {
                this.initFormView(new User(), popin, req('user/views/user/form.view'), 'new');
            },

            editService: function (req, popin, user_id) {
                var user = new User(),
                    self = this;

                this.repository.find(user_id).done(function (user_values) {
                    user.populate(user_values);
                    self.initFormView(user, popin, req('user/views/user/form.view'), 'edit');
                });
            },

            deleteService: function (req, popin, user_id) {
                var user = new User(),
                    self = this,
                    View = req('user/views/user/delete.view'),
                    view;

                this.repository.find(user_id).done(function (user_values) {
                    user.populate(user_values);

                    view = new View({popin: popin, user: user});
                    view.display().then(
                        function () {
                            self.repository.delete(user_id).done(function () {
                                self.indexService(require, popin);
                                Notify.success('User ' + user.login() + ' has been deleted.');
                            });
                            view.destruct();
                        },
                        function () {
                            view.destruct();
                        }
                    );
                });
            }
        });
    }
);