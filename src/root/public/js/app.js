angular.module('GalleryApp', ['angularUtils.directives.dirPagination', 'ngRoute'])
.config(function($routeProvider, $locationProvider){
    $locationProvider.html5Mode({
      enabled: true,
      rewriteLinks: 'internal-link'
      // requireBase: false
    });

    $routeProvider
      .when('/', {
        controller: 'GalleryController',
        templateUrl: '/partials/gallery.html'
      })
      .when('/rate', {
        controller: 'RateController',
        templateUrl: '/partials/rate.html'
      })
})
.factory('WorkFactory', function($http){
    return {
        getWorks: function(){
            return $http.get('/api/works');
        },
        scoreWork: function(id){
            return $http.get('/api/sentiment/' + id)
        },
        getRandom: function(){
            return $http.get('/api/works/random');
        },
        rateWork: function(options){
            return $http.post('/api/works/rate', options);
        }
    }
})
.controller('GalleryController', function($scope, WorkFactory){
    console.log('gallery loaded');

    $scope.sortBy = function(category){
        $scope.sort_category = category;
        $scope.reverse = !$scope.reverse;
    };

    $scope.loadWork = function(){
        WorkFactory.getWorks().then(function(resp){
            console.log('got works', resp);
            $scope.works = resp.data;

            $scope.works = $scope.works.map(function(work){
                var split = work.mia_url.split('/');
                var int_id = split[split.length-1];
                work.image_url = `http://api.artsmia.org/images/${int_id}/small.jpg`;

                return work;
            });
        },function(err){
            console.log('failed to get works', err);
        });
    };
    $scope.loadWork();

    $scope.scoreWork = function(id){
        WorkFactory.scoreWork(id).then(function(resp){
            console.log('did a score works', resp);
            $scope.loadWork();
        },function(err){
            console.log('failed to score works', err);
        });
    }
})
.controller('RateController', function($scope, WorkFactory){
    $scope.painting = {};
    $scope.ratings = {
        id: null,
        words: []
    };

    $scope.load = function(){
        WorkFactory.getRandom().then(function(resp){
            console.log('random', resp);
            $scope.painting = resp.data[0];
            var split = $scope.painting.mia_url.split('/');
            var int_id = split[split.length-1];
            $scope.painting.image_url = `http://api.artsmia.org/images/${int_id}/small.jpg`;

            // reset ratings
            $scope.ratings = {
                id: null,
                words: []
            };
        }).catch(function(err){
            console.log('err', err);
        });
    };
    $scope.load();

    $scope.present = function(word){
        return $scope.ratings.words.find(function(rating_word){
            return word == rating_word;
        });
    };

    $scope.select = function(word){
        $scope.ratings.id = $scope.painting.id;
        $scope.ratings.words.push(word);
    };

    $scope.rate = function(){
        WorkFactory.rateWork($scope.ratings).then(function(resp){
            console.log('rated', resp);
            $scope.load();
        },function(err){
            console.log('failed to score works', err);
        });
    };
})
