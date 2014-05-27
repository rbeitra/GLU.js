(function(scope){

    'use strict';

    var UrlParams = {};
        UrlParams.getUrlQuery = function(){
        return window.location.href.slice(window.location.href.indexOf('?') + 1);
    };
    UrlParams.getUrlVars = function(){
        var vars = [], hash;
        var hashes = UrlParams.getUrlQuery().split('&');
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    };
    UrlParams.getUrlVar = function(name){
        return UrlParams.getUrlVars()[name];
    };

    window.UrlParams = UrlParams;

}(this));