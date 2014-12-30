angular.module('frontpage.controllers', ['ionic.services.analytics'])

.controller('MainCtrl', function($scope, $ionicTrack, cfpLoadingBar){
  $scope.open = function(url){
    // Send event to analytics service
    $ionicTrack.track('open', {
      url: url
    });

    // open the page in the inAppBrowser plugin. Falls back to a blank page if the plugin isn't installed
    var params = 'location=no,' +
      'enableViewportScale=yes,' +
      'toolbarposition=top,' +
      'closebuttoncaption=Done';
    var iab = window.open(url,'_blank',params);
    // cordova tends to keep these in memory after they're gone so we'll help it forget
    iab.addEventListener('exit', function() {
      iab.removeEventListener('exit', argument.callee);
      iab.close();
      iab = null;
    });
  };
  //make sure we always clear any existing loading bars before navigation
  $scope.$on('$ionicView.beforeLeave', function(){
    cfpLoadingBar.complete();
  });
})

.controller('FrontPageCtrl', function($scope, HNFirebase, $state, cfpLoadingBar, $timeout) {
  $scope.pageName = 'Frontpage';
  $scope.posts = HNFirebase.getTopStories();
  $scope.refresh = function(){
    cfpLoadingBar.start();
    HNFirebase.fetchTopStories();
  };
  $scope.refresh();

  $scope.$watch(function($scope) {
    return HNFirebase.getTopStoriesPercentLoaded() ;
  }, function(percentComplete){
    if(percentComplete >= 1){
      cfpLoadingBar.complete();
    }else{
      cfpLoadingBar.set(percentComplete);
    }
  });

  $timeout(function(){$scope.timesUp = true},5000);

  $scope.loadComments = function(storyID){
    $state.go('tab.front-page-comments',{storyID:storyID});
  };
})

.controller('NewestCtrl', function($scope, HNFirebase, $state, cfpLoadingBar, $timeout) {
  // This is nearly identical to FrontPageCtrl and should be refactored so the pages share a controller,
  // but the purpose of this app is to be an example to people getting started with angular and ionic.
  // Therefore we err on repeating logic and being verbose
  $scope.pageName = 'Newest';
  $scope.posts = HNFirebase.getNewStories();
  HNFirebase.setNewStoriesCount(15);

  $scope.refresh = function(){
    cfpLoadingBar.start();
    HNFirebase.fetchNewStories();
  };

  $scope.loadMore = function(){
    HNFirebase.setNewStoriesCount(HNFirebase.getNewStoriesCount()+15);
    $scope.refresh();
  }

  $scope.$on('$ionicView.beforeEnter', function() {
    $scope.refresh();
  });

  // update the loading bar
  $scope.$watch(function($scope) {
    return $scope.posts.length ;
  }, function(posts){
    if(posts >= HNFirebase.getNewStoriesCount()){
      $scope.$broadcast('scroll.infiniteScrollComplete');
      cfpLoadingBar.complete();
    }else{
      cfpLoadingBar.set(posts/HNFirebase.getNewStoriesCount());
    }
  });

  $timeout(function(){$scope.timesUp = true},5000);

  $scope.loadComments = function(storyID){
    $state.go('tab.newest-comments',{storyID:storyID});
  };
})

.controller('CommentsCtrl', function($scope, HNFirebase, $stateParams, $sce, $timeout) {
  // requests take time, so we do a few things to keep things smooth.
  // we don't load comments until the page animation is over.
  // if after the page animation, the comments are still not available, we show a loading screen
  $scope.$on('$ionicView.beforeEnter', function(){
    HNFirebase.fetchComments($stateParams.storyID);
    $scope.comments = [];
    $scope.delay = true;
    $timeout(function(){$scope.timesUp = true},5000);
  });
  $scope.$on('$ionicView.afterEnter', function(){
    $scope.comments = HNFirebase.getComments();
  });
  $scope.$on('$ionicView.afterLeave', function(){
    $scope.timesUp = false;
  });
  $scope.$watch('comments', function() {
    if($scope.comments.length){
      $timeout(function(){$scope.delay = false},500)
    }
  });

  $scope.trust = function(comment){
    return '<p>'+$sce.trustAsHtml(comment);
  };
  $scope.bubbleCheck = function(e){
    if(e.toElement.tagName == "A"){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }
})

.controller('SearchCtrl', function($scope, Algolia, $ionicLoading, $state) {
  $scope.focused= 'centered';
  $scope.searchTerm = '';
  $scope.posts = [];
  if(typeof localStorage.searchCache != 'undefined'){
    var sc = JSON.parse(localStorage.searchCache);
    $scope.searchTerm = sc.term;
    $scope.posts = sc.results;
    $scope.focused = 'left';
  }
  $scope.search = function(searchTerm){
    if(searchTerm === '')return;
    $ionicLoading.show({
      template: 'Searching...'
    });
    document.getElementById('searchInput').blur();
    Algolia.search(searchTerm).then(function(searchResults){
      $scope.posts = searchResults.hits;
      localStorage.searchCache = JSON.stringify({term:searchTerm,results:searchResults.hits});
      $ionicLoading.hide();
      $scope.error = false;
    },function(){
      $scope.posts = [];
      $ionicLoading.hide();
      $scope.error = true;
    });
  };
  $scope.$on('fpSearchBar.clear', function(){
    $scope.posts = [];
    $scope.searchTerm = '';
    delete localStorage.searchCache;
  });
  $scope.loadComments = function(storyID){
    $state.go('tab.search-comments',{storyID:storyID});
  }
})
;
