angular.module('app', [])
	.controller('MainController' , function($scope) {
	  	var textModel = "Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum ";
		$scope.contact = {
			name:'Saved Name',
			details:textModel,
			actual_details:'zz'
		}
		$scope.defaultPreviewChars = 120;

		$scope.showDetailsInseadOfPreview = function(){
			this.contact.details = this.contact.actual_details;
		}
		$scope.showPreview = function(number){
			this.defaultPreviewChars = number;
			this.contact.actual_details = this.contact.details;
			var size = this.contact.details.length;
			if((size-number)<0){
				return;
			}
			this.contact.details = this.contact.details.substr(0, number) + ' ' + (size-number)+' characters more...';
		}

		$scope.toggle = function(){
			if(this.contact.details.indexOf('...')==-1){
				this.showPreview(this.defaultPreviewChars);
			}else{
				this.showDetailsInseadOfPreview();
			}
		}
	})
	.directive('showonhoverparent', function(){
		return {
         link : function(scope, element, attrs) {
            element.bind('mouseenter', function() {
                $(element[0].parentNode.children[1].children[0]).show();
            });
            element.bind('mouseleave', function() {
            	$(element[0].parentNode.children[1].children[0]).hide();
            });
       	}
	   	  };
	});
