'use strict';


// Helpers functions

// Swap two two items in an array based on their index
function swapTwoArrayItems(array, index1, index2) {
    var item = array[index1];
    array[index1] = array[index2];
    array[index2] = item;
    return array;
};

// Find index of an element in an array
function findIndex(array, elem) {
    for (var index in array) {
        var item = array[index];
        if (angular.equals(item, elem)) {
          return array.indexOf(item);
        }
    }
    return -1;
};

// define ncf app, using ui-bootstrap and its default templates
var app = angular.module('ncf', ['ui.bootstrap', 'ui.bootstrap.tpls', 'monospaced.elastic'])

// Declare controller ncf-builder
app.controller('ncf-builder', function ($scope, $modal, $http, $log, $location, $anchorScroll) {

  // Variable we use in the whole application

  // Path of ncf files, defined as a url parameter    
  $scope.path;
  // generic methods container
  $scope.generic_methods;
  // Generic methods order by category, used when we want to add new methods
  $scope.methodsByCategory;
  // ncf technique container
  $scope.techniques;

  // Selected technique, undefined when there is no selected technique
  $scope.selectedTechnique;
  $scope.originalTechnique;
  // Information about the selected method in a technique
  $scope.selectedMethod;
  // Are we adding new methods to a technique, false hides that panel
  $scope.addNew=false;
  // Are we authenticated on the interface
  $scope.authenticated = false;

  $scope.setPath = function() {
    var path = $location.search().path;
    if (path === undefined) {
      $scope.path = "";
    } else if ( path === true) {
      $scope.path = "";
    } else {
      $scope.path = path;
    }
  };

  // Define path by getting url params now
  $scope.setPath();

  // Define hash location url, this will make the page scroll to the good element since we use $anchorScroll
  $scope.scroll = function(id) {
    $location.hash(id);
  };

  // Capitalize first letter of a string
  $scope.capitaliseFirstLetter = function (string) {
    if (string.length === 0) {
      return string;
    } else {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  };

  $scope.handle_error = function(data, status, headers, config) {
      if (status === 401) {
        $scope.authenticated = false;
      }
    };

  // Transform a ncf technique into a valid UI technique
  // Add original_index to the method call, so we can track their modification on index
  $scope.toTechUI = function (technique) {
    if ("method_calls" in technique) {
      var calls = technique.method_calls.map( function (method_call, method_index) {
        method_call["original_index"] = method_index;
        return method_call;
      } );
      technique.method_calls = calls;
    }
    return technique;
  };

  // Transform a ui technique into a valid ncf technique by removint original_index param
  $scope.toTechNcf = function (baseTechnique) {
    var technique = angular.copy(baseTechnique);
    var calls = technique.method_calls.map( function (method_call, method_index) {
      delete method_call.original_index;
      return method_call;
    });
    technique.method_calls = calls;
    return technique;
  };

  // Check if a technique is selected
  $scope.isSelected = function(technique) {
    return angular.equals($scope.originalTechnique,technique);
  };

  // Check if a method is selected
  $scope.isSelectedMethod = function(method) {
    return angular.equals($scope.selectedMethod,method);
  };

  // Call ncf api to get techniques
  $scope.getTechniques = function () {

    $scope.techniques = [];
    var data = {params: {path: $scope.path}}
    $http.get('/ncf/api/techniques',data).
      success(function(data, status, headers, config) {
        for (var techKey in data) {
          var technique = $scope.toTechUI(data[techKey]);
          $scope.techniques.push(technique);
        }
      } ).
      error($scope.handle_error);
  };

  // Call ncf api to get genereric methods
  $scope.getMethods = function () {
    var data = {params: {path: $scope.path}}
    $http.get('/ncf/api/generic_methods', data).
      success(function(data, status, headers, config) {
        $scope.generic_methods = data;
        $scope.methodsByCategory = $scope.groupMethodsByCategory();
        $scope.authenticated = true;
      } ).
      error($scope.handle_error);
  };

  // Group methods by category, a category of a method is the first word in its name
  $scope.groupMethodsByCategory = function () {
    var groupedMethods = {};
    for (var methodKey in $scope.generic_methods) {
      var method = $scope.generic_methods[methodKey];
      var name = methodKey.split('_')[0];
      var grouped = groupedMethods[name];
      if (grouped === undefined) {
          groupedMethods[name] = [method];
      } else {
        groupedMethods[name].push(method);
      }
    };
    return groupedMethods;      
  };

  // Method used to check if we can select a technique without losing changes
  $scope.checkSelect = function(technique, select) {
    // No selected technique, select technique
    if ($scope.selectedTechnique === undefined) {
      select(technique);
    } else {

      if  ($scope.checkSelectedTechnique()) {
        // Selected technique is the same than actual selected technique, unselect it
        select(technique);
      } else {
        // Display popup that shanges will be lost, and possible discard them
        $scope.selectPopup(technique, select);
      }
    }
  };

  // Click on a Technique
  // Select it if it was not selected, unselect it otherwise
  $scope.selectTechnique = function(technique) {
    // Always clean Selected methods and add method
    $scope.addNew=false;
    $scope.selectedMethod = undefined;
    // Check if that technique is the same as the original selected one
    if(angular.equals($scope.originalTechnique,technique) ) {
      // It's the same, unselect the technique
      $scope.selectedTechnique = undefined;
      $scope.originalTechnique = undefined;
    } else {
      // Select the technique, by using angular.copy to have different objects
      $scope.selectedTechnique=angular.copy(technique);
      $scope.originalTechnique=angular.copy($scope.selectedTechnique);
    }
  };

  // Select a method in a technique
  $scope.selectMethod = function(method_call) {
    if(angular.equals($scope.selectedMethod,method_call) ) {
      $scope.selectedMethod = undefined;
    } else {
      $scope.addNew=false;
      $scope.selectedMethod=method_call;
    }
  };

  // Open generic methods menu to add them to the technique
  $scope.openMethods = function() {
    $scope.addNew=true;
    $scope.selectedMethod = undefined;
  };

  // Add a method to the technique
  $scope.addMethod = function(bundle) {
    var original_index = $scope.selectedTechnique.method_calls.length;
    var call = {
        "method_name" : bundle.bundle_name
      , "original_index" : original_index
      , "class_context" : "any"
      , "args": bundle.bundle_args.map(function(v,i) {
        return  "";
      })
    }

    $scope.selectedTechnique.method_calls.push(call);
  };

  // Check if a technique has not been changed, and if we can use reset function
  $scope.isUnchanged = function(technique) {
    return angular.equals(technique, $scope.originalTechnique);
  };

  // Check if a technique has been saved,
  $scope.isNotSaved = function() {
    return $scope.originalTechnique.bundle_name === undefined;
  };

  // Check if a method has not been changed, and if we can use reset function
  $scope.isUnchangedMethod = function(methodCall) {
    return angular.equals(methodCall, $scope.originalTechnique.method_calls[methodCall.original_index]);
  };

  // Reset a method to the current value in the technique
  $scope.resetMethod = function() {
    $scope.selectedMethod=angular.copy($scope.originalTechnique.method_calls[methodCall.original_index]);
  };

  // Create a new technique stub
  var newTech = {
      "method_calls" : []
    , "name": undefined
    , "description": ""
    , "version": "1.0"
    , "bundle_name": undefined
    , "bundle_args": []
  };

  $scope.newTechnique = function() {
    $scope.checkSelect(newTech, $scope.selectTechnique);
  };


  // Utilitary methods on Method call

  $scope.getMethodName = function(method_call) {
    if (method_call.method_name in $scope.generic_methods ) {
      return $scope.generic_methods[method_call.method_name].name;
    } else {
      return method_call.method_name;
    }
  };

  $scope.getMethodBundleName = function(method_call) {
    if (method_call.method_name in $scope.generic_methods ) {
      return $scope.generic_methods[method_call.method_name].bundle_name;
    } else {
      return method_call.method_name;
    }
  };


  // Get the desciption of a method call in definition of the generic method
  $scope.getMethodDescription = function(method_call) {
    if (method_call.method_name in $scope.generic_methods ) {
      return $scope.generic_methods[method_call.method_name].description;
    } else {
      return "";
    }
  };

  // Get the argument name of a method call in definition of the generic method
  $scope.getArgName = function(index,method_call) {
    if (method_call.method_name in $scope.generic_methods ) {
      return $scope.generic_methods[method_call.method_name].parameter[index].description;
    } else {
      return "arg";
    }
  };

  // Get the value of the parameter used in generated class
  $scope.getClassParameter= function(method_call) {
    if (method_call.method_name in $scope.generic_methods ) {
      var method = $scope.generic_methods[method_call.method_name];
      var class_parameter = method.class_parameter;
      var param_index = method.bundle_args.indexOf(class_parameter);
      return method_call.args[param_index];
    } else {
      return method_call.args[0];
    }
  }

  // Get the class prefix value
  $scope.getClassPrefix= function(method_call) {
    if (method_call.method_name in $scope.generic_methods ) {
      var method = $scope.generic_methods[method_call.method_name];
      return method.class_prefix;
    } else {
      // Not defined ... use method name
      return method_call.method_name;
    }
  }

  // Get the class value generated from a class prefix and a class kind (kept,repaired,error, ...)
  $scope.getClassKind= function(method_call,kind) {
    var param = $scope.getClassParameter(method_call).replace(/\W/g,"_");
    return  $scope.getClassPrefix(method_call)+"_"+param +"_"+kind
  }

  // Check if the selected technique is correct
  // selected technique is correct if:
  // * name is not empty
  // * There is at least one method call
  $scope.checkSelectedTechnique= function() {
     var res = $scope.selectedTechnique.name === undefined || $scope.selectedTechnique.name === "" || $scope.selectedTechnique.method_calls.length === 0;
     if ($scope.selectedTechnique.isClone) {
       return res
     } else {
       return res || $scope.isUnchanged($scope.selectedTechnique)
     }
  }

  // Technique actions

  // Remove method on specified index
  $scope.removeMethod= function(index) {
    $scope.selectedTechnique.method_calls.splice(index, 1);
  }

  // Move a method from an index to another index, and switch those
  $scope.move = function(from,to) {
    $scope.selectedTechnique.method_calls = swapTwoArrayItems($scope.selectedTechnique.method_calls,from,to);
  }

  // Move up the method in the hierachy
  $scope.moveUp = function(index) {
    $scope.move(index,index+1);
  }

  // Move down the method in the hierachy
  $scope.moveDown = function(index) {
    $scope.move(index,index-1);
  }

  // Resets a Technique to its original state
  $scope.resetTechnique = function() {
    $scope.selectedTechnique=angular.copy($scope.originalTechnique);
  };

  // Delete a technique
  $scope.deleteTechnique = function() {
    var data = {params: {path: $scope.path}};
    $http.delete("/ncf/api/techniques/"+$scope.selectedTechnique.bundle_name, data).
      success(function(data, status, headers, config) {
        var index = findIndex($scope.techniques,$scope.originalTechnique);
        $scope.techniques.splice(index,1);
        $scope.addNew=false;
        $scope.selectedMethod = undefined;
        $scope.selectedTechnique = undefined;
        $scope.originalTechnique = undefined;
      } ).
      error($scope.handle_error);
  };

  $scope.setBundleName = function (technique) {
    if (technique.bundle_name === undefined) {
      // Replace all non alpha numeric character (\W is [^a-zA-Z_0-9]) by _
      var bundle_name = technique.name.replace(/\W/g,"_");
      technique.bundle_name = bundle_name;
    }
    return technique;
  }

  // Save a technique
  $scope.saveTechnique = function() {
    // Set technique bundle name
    $scope.setBundleName($scope.selectedTechnique);
    // make a copy of data so we don't lose the selected technique
    var technique = angular.copy($scope.selectedTechnique);
    var origin_technique = angular.copy($scope.originalTechnique);

    var data = { "path" :  $scope.path, "technique" : $scope.toTechNcf(technique) }

    // Function to use after save is done
    // Update selected technique if it's still the same technique
    // update technique from the tree
    var saveSuccess = function(data, status, headers, config) {

      // Find index of the technique in the actual tree of technique (look for original technique)
      var index = findIndex($scope.techniques,origin_technique);
      if ( index === -1) {
        // Add a new techniuqe
        $scope.techniques.push(technique);
      } else {
        // modify techique in array
        $scope.techniques[index] = technique;
      }
      // Update technique if still selected
      if (angular.equals($scope.selectedTechnique, technique)) {
        $scope.originalTechnique=angular.copy(technique);
      }
    }

    // Actually save the technique through API
    if ($scope.originalTechnique.bundle_name === undefined) {
      $http.post("/ncf/api/techniques", data).
        success(saveSuccess).
        error($scope.handle_error);
    } else {
      $http.put("/ncf/api/techniques", data).
        success(saveSuccess).
        error($scope.handle_error);
    }
  };

  // Popup definitions

  // Popup to know if there is some changes to save before switching of selected technique
  // paramters:
  // - Next technique you want to switch too
  // - Action to perform once the technique you validate the popup
  $scope.selectPopup = function( nextTechnique, select ) {
    var modalInstance = $modal.open({
      templateUrl: 'SaveChangesModal.html',
      controller: SaveChangesModalCtrl,
      resolve: {
        technique: function () {
          return $scope.originalTechnique;
        }
      }
    });

    modalInstance.result.then(function (doSave) {
      if (doSave) {
        $scope.saveTechnique();
      }
      // run on success function
      select(nextTechnique)
    });
  };

  $scope.clonePopup = function() {

    var modalInstance = $modal.open({
      templateUrl: 'template/cloneModal.html',
      controller: cloneModalCtrl,
      resolve: {
        technique: function () {
          return angular.copy($scope.originalTechnique);
        }
      }
    });

    modalInstance.result.then(function (technique) {
      technique.isClone = true
      $scope.selectTechnique(technique);
    });
  };

  $scope.getMethods();
  $scope.getTechniques();
  $scope.setPath();
});


var cloneModalCtrl = function ($scope, $modalInstance, technique) {

  technique.bundle_name = undefined;
  $scope.technique = technique;
  $scope.oldTechniqueName = technique.name;

  $scope.clone = function() {
    $modalInstance.close(technique);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
};

var SaveChangesModalCtrl = function ($scope, $modalInstance, technique) {

  $scope.technique = technique;
  $scope.save = function() {
    $modalInstance.close(true);
  }

  $scope.discard = function () {
    $modalInstance.close(false);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
};

app.config(function($locationProvider) {
    $locationProvider.html5Mode(true);
});