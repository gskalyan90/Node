import '../sass/style.scss';

import { $, $$ } from './modules/bling';

import  typeAhead from './modules/typeAhead'

import ajaxHeart from './modules/heart'

import autocomplete from './modules/auto-complete';

autocomplete($('#address'), $('#lat'), $('#lng'))

typeAhead($('.search'))

import makeMap from './modules/map'

makeMap($('#map'))

const heartForms = $$('form.heart')
heartForms.on('submit', ajaxHeart)
