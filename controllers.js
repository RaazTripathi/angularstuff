/*
 * file: controllers.js
 * description: main controller for the Huron web app
 * general operation: 
 *     -takes search input and queries the back end server to get results
 *     -uses the templates in "card_controllers" directory to render each card according
 *      to the card type
 */

// Some global variables
var REPLACE_TRUE = true;
var globalResultCounter = 0;

/*
 * the controller for the main results screen
 */
angular.module('huron.controllers', []).
    controller('mainCtrl', 
                ['$scope','$location','$dialog','$http','$anchorScroll','$routeParams',
                 '$rootScope','$timeout','basketService','userStateService',
         function ($scope, $location,  $dialog,  $http,  $anchorScroll,  $routeParams,  
                   $rootScope, $timeout, basketService,userStateService) {

  var timeNow = new Date();
  var timestamp = timeNow.getTime();
  var searchDate = timeNow.toString();

  //used in templates for getting resources
  $scope.domain = document.domain + ":" + location.port;
  
    //utilty function to be used in templates all over
  $rootScope.isObjEmpty = function(obj){
    for(var key in obj) {
      if(obj.hasOwnProperty(key))
        return false;
    }
    return true;
  };
  
  //autocomplete
  $scope.acData = [];
  if(!$rootScope.acCache) 
    $rootScope.acCache = {};
  
  //watch for changes in textQuery and fetch autocomplete matches
  $scope.$watch("textQuery",function(prevVal, newVal){
    if (prevVal === newVal)
      return;
    var term = extractLast( $scope.textQuery );
    if ( term in $rootScope.acCache)
      return $rootScope.acCache[term];
    $http({url: "/autocomplete", method: 'GET', params: {query: term}, timeout: 5000})
      .success(function(data){
        $scope.acData = $.map( data, function( item ) {
          return {
            label: item.body.mk + " - " + item.body.l ,
            value: item.body.mk,
            category: "MK#"
          };
        });
        //one to many MK-L mapping, where L# is separated by commas.
        for (var i in data){
          var lNumTokens = data[i].body.l.split(',');
          for (var j in lNumTokens){
            $scope.acData.push({label: lNumTokens[j] + " - " + data[i].body.mk,
                      value: lNumTokens[j],
                      category: "L#"});
          }
        }
        
      });
  });
  
    //initialize models
    $scope.data=null;
    $scope.filteredData=null;
    $scope.filter={tags:{}};
    $scope.visibleStack = []; 
    $scope.showBasket = false;
    
    $scope.dataLoaded = true;
    
    $scope.desired_results = 10;
    
    //view mode: grid or list
    $scope.viewMode = userStateService.getViewMode();
    
    //pagination stuff
    $scope.currentPage = 1;
    $scope.currentCardIndex = 0;
    $scope.cardsPerPage = userStateService.getCardsPerPage();

    
    $scope.max_relevance = 99;
    $scope.params;
    
    $scope.textQuery = "";
    $scope.searchTermFinal = "";

    //Not used
    $scope.likes = [];
    $scope.dislikes = [];
    
    $scope.initLoad = true; //initial load of the controller. used for really "hiding" the basket notification
    
    $scope.cardsPerPageChoices = [4, 8, 12, 15, 28];
    
    $scope.searchClicked = function(){
      var tempSearchString = $scope.textQuery.replace(/(\\|\/)/," ").trim();
      if (tempSearchString !== ""){
        if ($scope.searchTermFinal === tempSearchString)
           $scope.runSearch();
        else{
          $scope.searchTermFinal = tempSearchString;
              $location.path('/main/'+ $scope.searchTermFinal);
        }
      }
      else{
          alert("please enter a search term");
      }
       
    };
    
    $scope.runSearch = function() {
      if ($scope.searchTermFinal !== undefined && $scope.searchTermFinal !=="") {
        $scope.params={
            query: $scope.searchTermFinal,
            sudo:  $routeParams.sudo
        };

        $scope.dataLoaded = false;
        $scope.serverError = false;

        //get query tokens for highlighting
        $scope.queryTokens=[];
        $scope.queryTokens = $scope.searchTermFinal.replace(/(AND|OR)/,"");
        $scope.queryTokens = $scope.queryTokens.split(" ");
        for (var i=0; i < $scope.queryTokens.length; i++){
          if($scope.queryTokens[i] === ""){
            $scope.queryTokens.splice(i,1);
            i--;
          }
        }

        $http({url: "/query", method: 'GET', params: $scope.params, timeout: 8000})
          .success(function(data) {
            $scope.data = data;
            $scope.filteredData = data;
            $scope.processSearchResults();
            $scope.dataLoaded = true;
          })
          .error(function(){
            $scope.dataLoaded = true;
            $scope.serverError = true;
            console.warn("query timed out");
          });
      } else{
        alert("please enter a search term");
        dataLoaded = true; //to remove the spinner
      }
    };
    
    //executed when http get response is returned.
    $scope.processSearchResults = function (){
      //aggregate unauthorized midas and suggested teamspace cards
      var midas_group_cards = [];
      var suggested_teamspace_cards = [];
      for (var i=0; i<$scope.data.length; i++){
        if ($scope.data[i].card_type.toLowerCase() === "midas_unauthorized"){
          midas_group_cards.push($scope.data[i]);
          $scope.data.splice(i,1);
          i--;
        } else if ($scope.data[i].card_type.toLowerCase() === "suggested_teamspaces"){
          suggested_teamspace_cards.push($scope.data[i]);
          $scope.data.splice(i,1);
          i--;
        }
      }
      
      // unauthorized midas
      if (midas_group_cards.length > 0){
        var agg_card = {
            card_title:"Suggested Midas Groups",
            card_type:"midas_unauthorized_table",
            relevance:midas_group_cards[0].relevance,
            body:[]};
        for (var i in midas_group_cards){
          if (midas_group_cards[i].relevance !==undefined
            && parseFloat(midas_group_cards[i].relevance) > parseFloat(agg_card.relevance))
            agg_card.relevance = midas_group_cards[i].relevance;
          agg_card.body.push(midas_group_cards[i].body);
        }
        $scope.data.push(agg_card);
      }
      
      // suggested teamspace
      if (suggested_teamspace_cards.length > 0){
        var agg_card = {
            card_title:"Suggested Teamspace Sites",
            card_type:"suggested_teamspaces",
            relevance:suggested_teamspace_cards[0].relevance,
            body:[]};
        for (var i in suggested_teamspace_cards){
          if (suggested_teamspace_cards[i].relevance !==undefined
            && parseFloat(suggested_teamspace_cards[i].relevance) > parseFloat(agg_card.relevance))
            agg_card.relevance = suggested_teamspace_cards[i].relevance;
          agg_card.body.push(suggested_teamspace_cards[i].body);
        }
        $scope.data.push(agg_card);
      }
      
      //sort data by relevance
      $scope.data = $scope.data.sort(function(a,b){
        if (parseFloat(a.relevance) > parseFloat(b.relevance))
          return -1;
        else
          return 1;
        
      });
      
      $scope.applyTagFilter();
      $scope.currentCardIndex = 0;
      $scope.currentPage = 1;
      if (typeof($scope.filteredData)==="object")
        $scope.renderPage();
    };
    
    $scope.gotoPage = function(page){
      $scope.currentCardIndex = $scope.cardsPerPage*(page-1);
      $scope.renderPage();
    };
    
    $scope.$watch('currentPage',function(prevVal, newVal){
      if (prevVal === newVal)
        return;
      $scope.gotoPage($scope.currentPage);
    });
    
    $scope.$watch('cardsPerPage',function(newVal, prevVal){
      if (prevVal === newVal)
        return;
      userStateService.setCardsPerPage(newVal);
      $scope.currentPage = 1;
      $scope.renderPage();
    });
    
    $scope.$watch('viewMode',function(newVal, prevVal){
      if (prevVal === newVal)
        return;
      userStateService.setViewMode(newVal);
    });
   
    // set up pop up dialogs
    $scope.dialogOpts = {
        backdrop : true,
        backdropFade: true,
        dialogFade: true,
        keyboard : true,
        backdropClick : true,
        templateUrl : "/huron/popup.html",
        controller : 'popupCtrl',
        resolve: {}   //to be used to pass data to controller
    };

    $scope.cardClicked = function(item) {
        if($scope.viewMode!=="grid")
            return;
        $scope.openModal(item);
    };
    
    $scope.miniCardClicked = function(item){
      $scope.openModal(item);
    };
    
    $scope.openModal = function(card){
        $scope.dialogOpts.resolve.card=function(){return angular.copy(card);}; //pass card item to controller
        $scope.dialogOpts.resolve.isSavedCard = function(){ return false;};
        var d = $dialog.dialog($scope.dialogOpts);
        d.open();
    };
    
    $scope.tagClicked = function($event, tag) {
      $event.stopImmediatePropagation();
        
      if ($scope.filter.tags[tag]===undefined){
            $scope.filter.tags[tag]=tag;
            //$scope.applyTagFilter();
            var tagparams = "";
            for (var i in $scope.filter.tags)
              tagparams+=i+",";
            $location.search("tags",tagparams);
        }
    };
    
    $scope.removeTagFromFilter = function(tag){
        delete $scope.filter.tags[tag];
        //$scope.applyTagFilter();
        var tagparams = "";
        for (var i in $scope.filter.tags)
          tagparams+=i+",";
        if (tagparams!=""){
          $location.search("tags",tagparams);
        }
        else
          $location.search("tags",null);
    };
    
    $scope.applyTagFilter = function(){
      $scope.filteredData=[];
      if (!$.isEmptyObject($scope.filter.tags)){
        for (var i in $scope.data){
          for (var j in $scope.data[i].tags)
            if ($scope.filter.tags[$scope.data[i].tags[j]] !==undefined){
              $scope.filteredData.push($scope.data[i]);
            }
        }
      }
      else
        $scope.filteredData = $scope.data;

      $scope.currentPage = 1;
      $scope.renderPage();
    };
    
    $scope.clearTagFilters = function(){
      $scope.filter.tags = {};
        //$scope.applyTagFilter();
        $location.search("tags",null);
    };

    
    $scope.toggleBasket = function(){
      $scope.showBasket = !$scope.showBasket;
    };
//    $scope.showBasketNotification = false;
//    
    $scope.addToBasket = function($event,card){
      $scope.initLoad = false;
      $event.stopImmediatePropagation();
      $scope.basketNotification = basketService.addToBasket(card);
      $scope.showBasketNotification = true;
      $timeout(function(){$scope.showBasketNotification = false;},1500);
      basketService.saveBasket();
    };
    
    $scope.numInBasket = 0;
    $scope.$watch( function () { return basketService.getNumInBasket(); }, function (count) {
        $scope.numInBasket = count;
    });
    
    $scope.renderPage = function() {
      // get total num pages
      $scope.numPages = Math.floor($scope.filteredData.length / $scope.cardsPerPage);
      if ($scope.filteredData.length % $scope.cardsPerPage !== 0)
        $scope.numPages++;

      $scope.visibleStack = [];
      if ($scope.filteredData == null)
        return;
      for (var i = $scope.currentCardIndex; 
          i < $scope.filteredData.length && i < $scope.currentCardIndex + $scope.cardsPerPage; 
          i++) {
        $scope.visibleStack.push($scope.createCard($scope.filteredData[i]));
      }
    };
    
    $scope.createCard = function (data) {
        var card = {};
        if (data!=null){
            card = {
                id : 'card_' + timestamp + "_" + globalResultCounter,
                query: $scope.searchTermFinal, 
                searchDate: searchDate,
                relevance : data.relevance,
                body : data.body,
                tags: {},
                resourceIds : data.resourceIds,
                type: decodeURIComponent(data.card_type).toLowerCase().replace(/ /g,"_"),
                title: data.card_title
            };
            
            if (data.tags !== undefined){
                for (var i=0; i<data.tags.length; i++){
                    card.tags[data.tags[i]]=data.tags[i];
                }
            }
           
            globalResultCounter++;
        }

        return card;
    };
  
    // Code needs to be after "runSearch" definition
    if ($routeParams.query !== undefined && $routeParams.query !== ""){
        $scope.textQuery = $routeParams.query;
        $scope.searchTermFinal = $scope.textQuery;
        if($location.search().tags){
          var tags = $location.search().tags.split(",");
          for (var i in tags){
            if (tags[i] !=="")
              $scope.filter.tags[tags[i]]=tags[i];
          }
      }
        $scope.runSearch();
    }
}]) 

/* 
 * the controller for the landing screen 
 * */
.controller('landingCtrl', ['$scope','$location','$http','$rootScope','basketService',
                            function($scope,$location,$http,$rootScope,basketService) {
  //controller for the initial landing page
  $scope.numInBasket = 0;
  $scope.$watch( function () { return basketService.getNumInBasket(); }, function (count) {
    $scope.numInBasket = count;
  });

  $scope.showBasket = false;
  $scope.toggleBasket = function(){
    $scope.showBasket = !$scope.showBasket;
  };

  $scope.acData = [];
  if(!$rootScope.acCache) 
    $rootScope.acCache = {};
  $scope.$watch("textQuery",function(prevVal, newVal){
    if (prevVal === newVal)
      return;
    var term = extractLast( $scope.textQuery );
    if ( term in $rootScope.acCache)
      return $rootScope.acCache[term];
    $http({url: "/autocomplete", method: 'GET', params: {query: term}, timeout: 5000})
    .success(function(data){
      $scope.acData = $.map( data, function( item ) {
        return {
          label: item.body.mk + " - " + item.body.l ,
          value: item.body.mk,
          category: "Compound IDs"
        };
      });

      //one to many MK-L mapping, where L# is separated by commas.
      for (var i in data){
        var lNumTokens = data[i].body.l.split(',');
        for (var j in lNumTokens){
          $scope.acData.push({label: lNumTokens[j] + " - " + data[i].body.mk,
            value: lNumTokens[j],
            category: "L#"});
        }
      }
    });
  });

  $scope.go = function() {
    if ($scope.textQuery !== undefined && $scope.textQuery.trim() !== "" )
      $location.path('/main/'+ $scope.textQuery);
    else
      alert("please enter a search term");
  };

  $scope.systemMessagesHidden={};
  var cookie = document.cookie;
  var msgIds = cookie.split(";");
  for(var i in msgIds) 
  {
    var msgIdKeyPair = msgIds[i].split("=");
    if (msgIdKeyPair.length > 1 && msgIdKeyPair[1]=="hide")
      $scope.systemMessagesHidden[msgIdKeyPair[0].trim()] = true;
  }
  
  //get system message
  $scope.systemMessage = "";
  var msg_index = 0;
  var validMessages = [];
  var messagesToHide = [];
  $http({url: "/system-messages", method: 'GET',timeout: 5000})
    .success(function(data){
      var todayMs = (new Date()).getTime();
      for (var i in data){
        if (data[i].startTimestamp <= todayMs 
           && data[i].endTimestamp >= todayMs
           && $scope.systemMessagesHidden[String(data[i].uuid)] === undefined){
          validMessages.push(data[i]);
        }
      }
      //randomly pick 1
      if (validMessages.length > 0) {
        var msg_index = Math.floor((Math.random()* validMessages.length ));
        $scope.systemMessage = validMessages[msg_index].message;
        $scope.systemMessageId = String(validMessages[msg_index].uuid);
      }
      messagesToHide = [];
    });
  //Go to the next system message
  $scope.seeNextMessage = function() {
    if(msg_index == (validMessages.length-1)) {
      msg_index = 0;
    } else {
      msg_index = msg_index + 1;
    }
    $scope.systemMessage = validMessages[msg_index].message;
    $scope.systemMessageId = String(validMessages[msg_index].uuid);
    for(var i in messagesToHide){
      $scope.doNotShowAgain = false;
      if(messagesToHide[i] == $scope.systemMessageId){
        $scope.doNotShowAgain = true;
        break;
      }     
    }
  };
  //Go to the previous system message
  $scope.seePreviousMessage = function() {
    if(msg_index == 0) {
      msg_index = (validMessages.length-1);
    } else {
      msg_index = msg_index - 1;
    }
    $scope.systemMessage = validMessages[msg_index].message;
    $scope.systemMessageId = String(validMessages[msg_index].uuid);
    for(var i in messagesToHide){
      $scope.doNotShowAgain = false;
      if(messagesToHide[i] == $scope.systemMessageId){
        $scope.doNotShowAgain = true;
        break;
      }
    }
  };
  $scope.doNotShowAgain = false;
  $scope.checkTheBox = function(){
    if ($scope.doNotShowAgain){
      messagesToHide.push($scope.systemMessageId); 
    }
    else{
      for(var i in messagesToHide){
        if(messagesToHide[i] == $scope.systemMessageId){
          messagesToHide.splice(i,1);
          break;
        }
      }
    }
  };
  $scope.closeSystemMessage = function(){
    if(messagesToHide.length > 0){    
      for(var i in messagesToHide){
        //update cookies
        var d = new Date();
        /*cookie expires in 60 days */
        d.setTime(d.getTime()+(60*24*60*60*1000));
        var expires = "expires="+d.toGMTString();
        document.cookie = "" + messagesToHide[i] + "=hide; " + expires;
        }
      }
    $scope.systemMessage = "";
  };

}])

/* 
 * the controller for the popups when small cards are clicked 
 */
.controller('popupCtrl', ['$scope','dialog','card','isSavedCard','$location',
                    function($scope, dialog, card, isSavedCard,$location){
    $scope.card = card;
    $scope.isSavedCard = isSavedCard;
    $scope.viewMode = "list";
    $scope.dialogClose = function(){
        dialog.close('ok');
    };
    
    $scope.tagClicked = function(event,tag){
      $location.search("tags",tag);
      dialog.close('ok');
    };
    
    $scope.dialog = dialog;
}])

/*
 * controller for the full screen mode of a card
 * (only available for some of the card types)
 */
.controller('cardFullScrCtrl', ['$scope','$rootScope', 
                                     function($scope, $rootScope){
    $scope.card=$rootScope.selectedCard;
    $scope.viewMode = 'fullscreen';
}])
.controller('basket_ctrl', ['$scope','$rootScope','$location','basketService','$dialog',
                     function($scope, $rootScope, $location,basketService, $dialog){
  $scope.viewMode = 'list';
  
  $scope.basket = [];
    basketService.loadBasket();
    
    $scope.basketSortOptions = {
       update: function(e, ui) { 
         basketService.setBasket($scope.basket);
         basketService.saveBasket();
       },
    };
    
    $scope.miniCardClicked = function(item) {
        $scope.openModal(item);
    };
    
    $scope.dialogOpts = {
        backdrop : true,
        backdropFade: true,
        dialogFade: true,
        keyboard : true,
        backdropClick : true,
        templateUrl : "/huron/popup.html",
        controller : 'popupCtrl',
        resolve: {}   //to be used to pass data to controller
    };
    
    $scope.openModal = function(card){
        $scope.dialogOpts.resolve.card=function(){return angular.copy(card);}; //pass card item to controller
        $scope.dialogOpts.resolve.isSavedCard =  function(){ return true;};
        var d = $dialog.dialog($scope.dialogOpts);
        d.open();
    };

    $scope.basket = basketService.getBasket();
    $scope.$watch( function () { return basketService.getBasket(); }, function (basket ) {
      $scope.basket = basket;
    },true);

    
    $scope.$watch( function () { return basketService.getLastDeleted(); }, function ( lastDeleted ) {
      $scope.lastDeleted = lastDeleted;
    });
    
    $scope.undoDelete = function(){
      basketService.undoDelete();
      basketService.saveBasket();
    };
    
    $scope.removeFromBasket = function($event,index){
      $event.stopImmediatePropagation();
      basketService.removeFromBasket(index);
      basketService.saveBasket();
    };
    
    $scope.clearBasket = function(){
      basketService.clearBasket();
      basketService.saveBasket();
    };
    
    $scope.downloadBasket = function(format){
      if (format === "pdf")
        console.log('pdf download');
      else if (format === "word")
        console.log("word download");
      else if (format === 'email')
        console.log("email");
    };
    
    $scope.seeBasketFull = function(){
      $rootScope.basket = $scope.basket;
      $location.path('/basket/');
    };
  
}]);





