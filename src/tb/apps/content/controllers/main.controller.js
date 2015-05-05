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
        'content.dnd.manager',
        'content.mouseevent.manager',
        'content.save.manager',
        'content.manager',
        'content.view.contribution.index',
        'definition.manager',
        'content.repository',
        'revision.repository',
        'component!revisionselector',
        'jquery',
        'content.widget.DialogContentsList'
    ],
    function (
        Core,
        DndManager,
        MouseEventManager,
        SaveManager,
        ContentManager,
        ContributionIndexView,
        DefinitionManager,
        ContentRepository,
        RevisionRepository,
        RevisionSelector,
        jQuery,
        DialogContentsList
    ) {
        'use strict';

        var trans = Core.get('trans') || function (value) {return value; };

        Core.ControllerManager.registerController('MainController', {
            appName: 'content',

            EDITABLE_ELEMENTS: ['Element/Text'],

            config: {
                imports: ['content.repository'],
                define: {
                    editionService: ['content.widget.Edition', 'content.manager'],
                    getPluginManagerService: ['content.pluginmanager'],
                    saveService: ['component!popin', 'component!translator']
                }
            },

            /**
             * Initialize of Bundle Controller
             */
            onInit: function () {
                this.repository = require('content.repository');
            },

            computeImagesInDOMService: function () {
                ContentManager.computeImages('body');
            },

            addDefaultZoneInContentSetService: function () {
                Core.Scope.subscribe('block', function () {
                    ContentManager.addDefaultZoneInContentSet(true);
                }, function () {
                    ContentManager.addDefaultZoneInContentSet(false);
                });
            },

            /**
             * Return the content repository
             */
            getRepositoryService: function () {
                return this.repository;
            },

            /**
             * Return the dialog content list widget
             */
            getDialogContentsListWidgetService: function () {
                return DialogContentsList;
            },

            /**
             * Return the definition manager
             */
            getDefinitionManagerService: function () {
                return DefinitionManager;
            },

            /**
             * Return the definition manager
             */
            getContentManagerService: function () {
                return ContentManager;
            },

            getPluginManagerService: function (req) {
                return req('content.pluginmanager');
            },

            editionService: function (req) {
                var EditionHelper = req('content.widget.Edition'),
                    ContentHelper = req('content.manager');

                return {
                    EditionHelper: EditionHelper,
                    ContentHelper: ContentHelper
                };
            },

            /**
             * Call method save into SaveManager
             */
            saveService: function (req) {
                var popin = req('component!popin').createPopIn(),
                    translator = req('component!translator'),
                    nbContents = SaveManager.getContentsToSave().length;

                popin.setTitle(translator.translate('save_draft'));
                popin.addButton('Ok', popin.hide);

                if (nbContents > 0) {
                    popin.mask();
                    SaveManager.save().done(function () {
                        popin.setContent(nbContents + ' ' + translator.translate((nbContents === 1) ? 'content_saved_sentence' : 'content_saved_sentence_plural'));
                        popin.unmask();
                    });
                } else {
                    popin.setContent(translator.translate('no_content_save'));
                }

                popin.display();
            },

            /**
             * Show the revision selector
             * @returns {undefined}
             */
            cancelService: function () {
                var config = {
                    popinTitle: trans('cancel_confirmation'),
                    title: trans('cancel_changes_content_below') + ' :',
                    onSave: function (data, popin) {
                        popin.mask();
                        RevisionRepository.save(data, 'revert').done(function () {
                            popin.hide();
                        });
                    }

                };

                new RevisionSelector(config).show();
            },

            /**
             * Show the revision selector
             * @returns {undefined}
             */
            validateService: function () {
                var config = {
                    popinTitle: trans('saving_confirmation'),
                    title: trans('confirm_saving_changes_content_below') + ' :',
                    onSave: function (data, popin) {
                        popin.mask();
                        RevisionRepository.save(data, 'commit').done(function () {
                            popin.hide();
                        });
                    }
                };

                new RevisionSelector(config).show();
            },

            getEditableContentService: function (content) {
                var self = this,
                    dfd = new jQuery.Deferred(),
                    element,
                    result = [];

                if (jQuery.inArray(content.type, this.EDITABLE_ELEMENTS) !== -1) {
                    result.push(content);
                    dfd.resolve(result);
                } else {
                    content.getData('elements').done(function (elements) {
                        jQuery.each(elements, function (subContentName) {
                            element = elements[subContentName];
                            if (jQuery.inArray(element.type, self.EDITABLE_ELEMENTS) === -1) {
                                return true;
                            }
                            result.push(ContentManager.buildElement(element));
                        });
                        dfd.resolve(result);
                    });
                }

                return dfd.promise();
            },

            contributionIndexAction: function () {

                var self = this;

                Core.ApplicationManager.invokeService('contribution.main.index').done(function (service) {
                    service.done(function () {
                        Core.Scope.register('contribution', 'block');

                        if (self.contribution_loaded !== true) {
                            ContentRepository.findCategories().done(function (categories) {
                                var view = new ContributionIndexView({
                                    'categories': categories
                                });
                                view.render();

                                self.contribution_loaded = true;

                                DndManager.initDnD();

                                Core.ApplicationManager.invokeService('contribution.main.manageTabMenu', '#edit-tab-block');
                            });
                        } else {
                            Core.ApplicationManager.invokeService('contribution.main.manageTabMenu', '#edit-tab-block');
                        }
                    });
                });
            },

            contributionEditAction: function () {
                Core.ApplicationManager.invokeService('contribution.main.index').done(function (service) {
                    service.done(function () {
                        Core.Scope.register('contribution', 'content');
                        Core.ApplicationManager.invokeService('contribution.main.manageTabMenu', '#edit-tab-content');
                    });
                });
            },

            createView: function (Constructor, config, render) {
                var view = new Constructor(config);

                if (render) {
                    view.render();
                }
            },

            findDefinitionsService: function (page_uid) {
                return require('content.repository').findDefinitions(page_uid);
            },

            listenDOMService: function (definitions) {
                DefinitionManager.setDefinitions(definitions);

                Core.Scope.subscribe('contribution', function () {
                    DndManager.bindEvents();
                    MouseEventManager.enable(true);
                }, function () {
                    DndManager.unbindEvents();
                    MouseEventManager.enable(false);
                });

                MouseEventManager.listen();
            }
        });
    }
);
