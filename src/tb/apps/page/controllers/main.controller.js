/*
 * Copyright (c) 2011-2013 Lp digital system
 *
 * This file is part of BackBee.
 *
 * BackBee is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BackBee is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BackBee. If not, see <http://www.gnu.org/licenses/>.
 */

define(
    [
        'Core',
        'page.view.contribution.index',
        'page.view.delete',
        'page.view.new',
        'page.view.edit',
        'page.view.clone',
        'page.view.manage',
        'page.view.tree',
        'page.view.tree.contribution',
        'page.repository',
        'Core/Request',
        'Core/RequestHandler'
    ],
    function (
        Core,
        ContributionIndexView,
        DeleteView,
        NewView,
        EditView,
        CloneView,
        ManageView,
        PageTreeView,
        PageTreeViewContribution,
        PageRepository,
        Request,
        RequestHandler
    ) {

        'use strict';

        Core.ControllerManager.registerController('MainController', {

            appName: 'page',

            config: {
                imports: ['page.repository']
            },

            /**
             * Initialize of Page Controller
             */
            onInit: function () {
                this.mainApp =  Core.get('application.main');
                this.repository = require('page.repository');
            },

            /**
             * Index action
             * Show the index in the edit contribution toolbar
             */
            contributionIndexAction: function () {

                var self = this;

                Core.ApplicationManager.invokeService('contribution.main.index').done(function (service) {
                    service.done(function () {

                        Core.Scope.register('contribution', 'page');

                        if (self.contribution_loaded !== true) {
                            self.repository.findCurrentPage().done(function (data) {
                                if (data.hasOwnProperty(0)) {
                                    data = data[0];
                                }

                                var view = new ContributionIndexView({'data': data});
                                view.render();

                                self.contribution_loaded = true;

                                Core.ApplicationManager.invokeService('contribution.main.manageTabMenu', '#edit-tab-page');
                            });
                        } else {
                            Core.ApplicationManager.invokeService('contribution.main.manageTabMenu', '#edit-tab-page');
                        }
                    });
                });
            },

            /**
             * Show tree with pages
             */
            treeService: function (config) {
                var view = new PageTreeViewContribution(config);

                view.render();
            },

            getPageTreeViewInstanceService: function () {
                return PageTreeView;
            },

            getPageRepositoryService: function () {
                return PageRepository;
            },

            /**
             * Delete action
             * Delete page with uid
             * @param {String} uid
             */
            deletePageService: function (config) {
                var view = new DeleteView(config);
                view.render();
            },

            findCurrentPageService: function () {
                return this.repository.findCurrentPage();
            },

            clonePageService: function (config) {
                var view = new CloneView(config);
                view.render();
            },

            newPageService: function (config) {
                if ('redirect' === config.flag) {
                    config.callbackAfterSubmit = this.newPageRedirect;
                }
                var view = new NewView(config);
                view.render();
            },

            editPageService: function (config) {
                var view = new EditView(config);
                view.render();
            },

            /**
             * Manage pages action
             */
            manageAction: function () {
                var view = new ManageView();
                view.render();
            },

            newPageRedirect: function (data, response) {
                if (response.getHeader('Location')) {
                    var request = new Request();
                    request.setUrl(response.getHeader('Location'));
                    RequestHandler.send(request).then(
                        function (page) {
                            if (page.uri) {
                                document.location.href = page.uri;
                            }
                        }
                    );
                }
                return data;
            }
        });
    }
);
