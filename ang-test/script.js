function SettingsController2($scope) {
  $scope.name = "John Smith";
  $scope.contacts = [
    {type:'phone', value:'408 555 1212', alt:''},
    {type:'email', value:'john.smith@example.org', alt:''}];
 
  $scope.greet = function() {
   alert(this.name);
  };
  $scope.hover = function() {
   alert(this.name);
  };
 
  $scope.addContact = function() {
   this.contacts.push({type:'email', value:'yourname@example.org'});
  };
 
  $scope.removeContact = function(contactToRemove) {
   var index = this.contacts.indexOf(contactToRemove);
   this.contacts.splice(index, 1);
  };
 
  $scope.clearContact = function(contact) {
   contact.type = 'phone';
   contact.value = '';
  };
  $scope.toggleContent = function(contact){
    if(contact.value.indexOf('...')==-1)
    {
      contact.alt = contact.value;
      contact.value = '...'+contact.value.substr(contact.value.length-3, contact.value.length-1);
    }else{
      contact.value = contact.alt;
    }
  }
}