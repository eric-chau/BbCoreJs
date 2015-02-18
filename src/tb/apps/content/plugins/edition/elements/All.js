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
        'require',
        'jquery',
        'content.repository',
        'jsclass'
    ],
    function (require, jQuery) {

        'use strict';

        var All = {

            init: function (definition) {
                this.definition = definition;

                return this;
            },

            getConfig: function (object) {
                var dfd = jQuery.Deferred(),
                    config;

                require('content.repository').find(object.type, object.uid).done(function (content) {

                    config = {
                        'type': 'content',
                        'label': object.name,
                        'object_name': object.name,
                        'image': content.image
                    };

                    dfd.resolve(config);
                });

                return dfd.promise();
            }
        };

        return All;
    }
);