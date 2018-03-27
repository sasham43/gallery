angular.module('GalleryApp', ['angularUtils.directives.dirPagination'])
.factory('WorkFactory', function($http){
    return {
        getWorks: function(){
            return $http.get('/api/works');
        },
        scoreWork: function(id){
            return $http.get('/api/sentiment/' + id)
        }
    }
})
.controller('GalleryController', function($scope, WorkFactory){
    console.log('gallery loaded');

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
