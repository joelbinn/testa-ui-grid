var app = angular.module('app', ['ngTouch', 'ui.grid', 'ui.grid.infiniteScroll', 'ui.grid.edit', 'ui.grid.rowEdit', 'ui.grid.cellNav', 'ui.grid.resizeColumns', 'ui.grid.selection']);
app.filter('mapFruit', function() {
  var genderHash = {
    1: 'Banan',
    2: 'Ananas'
  };

  return function(input) {
    if (!input) {
      return '';
    } else {
      return genderHash[input];
    }
  };
});
app.filter('mapBeer', function() {
  var genderHash = {
    1: 'Lager',
    2: 'IPA'
  };

  return function(input) {
    if (!input) {
      return '';
    } else {
      return genderHash[input];
    }
  };
});
app.controller('MainCtrl', ['$scope', '$http', '$timeout', '$q', '$interval', 'uiGridConstants',
  function($scope, $http, $timeout, $q, $interval, uiGridConstants) {
    $scope.clickItem = function(item) {
      console.debug('Clicked: ', item);
      console.log('Selection: ', $scope.gridApi.selection.getSelectedGridRows());
    };
    $scope.contextMenu = [{name: 'Kost1'},{name: 'Kost2'}];

    $scope.userInfoColumnsVisible = true;
    $scope.reviewColumnsVisible = false;
    $scope.numberOfItems = 0;
    $scope.gridOptions = {
      multiSelect: true,
      infiniteScrollRowsFromEnd: 40,
      infiniteScrollUp: true,
      infiniteScrollDown: true,
      rowEditWaitInterval: -1,
      columnDefs: [{
        name: 'id',
        type: 'number'
      }, {
        name: 'name',
        visible: $scope.userInfoColumnsVisible
      }, {
        name: 'age',
        visible: $scope.userInfoColumnsVisible
      }, {
        name: 'fruit',
        field: 'fruit',
        visible: $scope.reviewColumnsVisible,
        editableCellTemplate: 'ui-grid/dropdownEditor',
        width: '20%',
        cellFilter: 'mapFruit',
        editDropdownValueLabel: 'fruit',
        editDropdownOptionsArray: [{
          id: 1,
          fruit: 'Banan'
        }, {
          id: 2,
          fruit: 'Ananas'
        }],
        enableCellEditOnFocus: true
      },{
        name: 'beer',
        field: 'beer',
        visible: $scope.reviewColumnsVisible,
        editableCellTemplate: 'beer.html',
        width: '20%',
        cellFilter: 'mapBeer',
        editDropdownValueLabel: 'beer',
        editDropdownOptionsArray: [{
          id: 1,
          beer: 'Lager'
        }, {
          id: 2,
          beer: 'IPA'
        }],
        enableCellEditOnFocus: true
      }],
      data: 'data',
      onRegisterApi: function(gridApi) {
        gridApi.infiniteScroll.on.needLoadMoreData($scope, $scope.getDataDown);
        gridApi.infiniteScroll.on.needLoadMoreDataTop($scope, $scope.getDataUp);
        gridApi.edit.on.beginCellEdit($scope, function(rowEntity, colDef) {
          console.log('Start editing cell: ', colDef, ', entity: ', rowEntity);
        });
        gridApi.edit.on.afterCellEdit($scope, function(rowEntity, colDef, newVal, oldVal) {
          console.log('Finish editing cell: ', colDef, ', entity: ', rowEntity, ' before: ', oldVal, ' after: ', newVal);
        });
        gridApi.rowEdit.on.saveRow($scope, function(rowEntity, colDef) {
          console.log('Save row: ', rowEntity);
          var promise = $q.defer();
          $scope.gridApi.rowEdit.setSavePromise(rowEntity, promise.promise);
          $interval(function() {
            promise.resolve();
          }, 1, 1);
        });

        $scope.gridApi = gridApi;
      }
    };

    $scope.data = [];

    $scope.firstPage = 0;
    $scope.lastPage = 0;

    $scope.delete = function(grid, row, col) {
      console.log('delete entity in row: ', row, ', col: ', col, ', entity: ', row.entity);
    };

    $scope.getFirstData = function() {
      $scope.loading = true;
      var promise = $q.defer();
      $http.get('https://cdn.rawgit.com/angular-ui/ui-grid.info/gh-pages/data/10000_complex.json')
        .success(function(data) {
          $scope.numberOfItems = data.length;
          var newData = $scope.getPage(data, $scope.lastPage);
          $scope.data = $scope.data.concat(newData);
          promise.resolve();
        }).
      finally(function() {
        $scope.loading = false;
      });
      return promise.promise;
    };

    $scope.getDataDown = function() {
      $scope.loading = true;
      var promise = $q.defer();
      $http.get('https://cdn.rawgit.com/angular-ui/ui-grid.info/gh-pages/data/10000_complex.json')
        .success(function(data) {
          $scope.lastPage++;
          var newData = $scope.getPage(data, $scope.lastPage);
          $scope.gridApi.infiniteScroll.saveScrollPercentage();
          $scope.data = $scope.data.concat(newData);
          console.debug('Add Down, Data length: ', $scope.data.length);
          $scope.gridApi.infiniteScroll.dataLoaded($scope.firstPage > 0, $scope.lastPage < $scope.numberOfItems).then(function() {
            console.debug('Add Down, Check Up');
            $scope.checkDataLength('up');
          }).then(function() {
            promise.resolve();
          });
        })
        .error(function(error) {
          $scope.gridApi.infiniteScroll.dataLoaded();
          promise.reject();
        }).
      finally(function() {
        $scope.loading = false;
      });
      return promise.promise;
    };

    $scope.getDataUp = function() {
      $scope.loading = true;
      var promise = $q.defer();
      $http.get('https://cdn.rawgit.com/angular-ui/ui-grid.info/gh-pages/data/10000_complex.json')
        .success(function(data) {
          $scope.firstPage--;
          var newData = $scope.getPage(data, $scope.firstPage);
          $scope.gridApi.infiniteScroll.saveScrollPercentage();
          $scope.data = newData.concat($scope.data);
          console.debug('Add Up, Data length: ', $scope.data.length);
          $scope.gridApi.infiniteScroll.dataLoaded($scope.firstPage > 0, $scope.lastPage < $scope.numberOfItems).then(function() {
            console.debug('Add Up, Check Down');
            $scope.checkDataLength('down');
          }).then(function() {
            promise.resolve();
          });
        })
        .error(function(error) {
          $scope.gridApi.infiniteScroll.dataLoaded();
          promise.reject();
        }).
      finally(function() {
        $scope.loading = false;
      });
      return promise.promise;
    };


    $scope.getPage = function(data, page) {
      var res = [];
      for (var i = (page * 100); i < (page + 1) * 100 && i < data.length; ++i) {
        res.push(data[i]);
      }
      return res;
    };

    $scope.checkDataLength = function(discardDirection) {
      // work out whether we need to discard a page, if so discard from the direction passed in
      if ($scope.lastPage - $scope.firstPage > 3) {
        // we want to remove a page
        $scope.gridApi.infiniteScroll.saveScrollPercentage();

        if (discardDirection === 'up') {
          $scope.data = $scope.data.slice(100);
          console.debug('Remove Up, Data length: ', $scope.data.length);
          $scope.firstPage++;
          $timeout(function() {
            // wait for grid to ingest data changes
            $scope.gridApi.infiniteScroll.dataRemovedTop($scope.firstPage > 0, $scope.lastPage < $scope.numberOfItems);
          });
        } else {
          $scope.data = $scope.data.slice(0, 400);
          console.debug('Remove Down, Data length: ', $scope.data.length);
          $scope.lastPage--;
          $timeout(function() {
            // wait for grid to ingest data changes
            $scope.gridApi.infiniteScroll.dataRemovedBottom($scope.firstPage > 0, $scope.lastPage < $scope.numberOfItems);
          });
        }
      }
    };

    $scope.reset = function() {
      $scope.firstPage = 0;
      $scope.lastPage = 2;

      // turn off the infinite scroll handling up and down - hopefully this won't be needed after @swalters scrolling changes
      $scope.gridApi.infiniteScroll.setScrollDirections(false, false);
      $scope.data = [];

      $scope.getFirstData().then(function() {
        $timeout(function() {
          // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
          $scope.gridApi.infiniteScroll.resetScroll($scope.firstPage > 0, $scope.lastPage < $scope.numberOfItems);
        });
      });
    };

    $scope.save = function(grid) {
      console.log('Save');
      if ($scope.gridApi.rowEdit.getDirtyRows().length > 0) {
        $scope.gridApi.rowEdit.flushDirtyRows(grid);
      }
    };

    $scope.showAllColumns = function() {
      console.log('Show columns');
      $scope.userInfoColumnsVisible = true;
      $scope.reviewColumnsVisible = true;
      $scope.gridOptions.columnDefs.forEach(function(cd){
        cd.visible=true;
      });
      $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
    };

    $scope.toggleReviewColumns = function() {
      console.log('Show review columns');
      $scope.reviewColumnsVisible = !$scope.reviewColumnsVisible;
      $scope.gridOptions.columnDefs.forEach(function(cd){
        if (cd.name === 'beer' || cd.name === 'fruit') {
          cd.visible=!cd.visible;
        }
      });
      $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
    };

    $scope.toggleUserInfoColumns = function() {
      console.log('Show review columns');
      $scope.userInfoColumnsVisible = !$scope.userInfoColumnsVisible;
      $scope.gridOptions.columnDefs.forEach(function(cd){
        if (cd.name === 'name' || cd.name === 'age') {
          cd.visible=!cd.visible;
        }
      });
      $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
    };

    $scope.isDirty = function() {
      if ($scope.gridApi) {
        return $scope.gridApi.rowEdit.getDirtyRows().length > 0;
      }
      return false;
    };

    $scope.columnsAreFiltered = function() {

      return $scope.gridOptions === undefined || $scope.gridOptions.columnDefs.filter(function(cd){
          return cd.visible === false;
      }).length > 0;
    };

    $scope.getFirstData().then(function() {
      $timeout(function() {
        // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
        // you need to call resetData once you've loaded your data if you want to enable scroll up,
        // it adjusts the scroll position down one pixel so that we can generate scroll up events 
        $scope.gridApi.infiniteScroll.resetScroll($scope.firstPage > 0, $scope.lastPage < 4);
      });
    });

  }
]);