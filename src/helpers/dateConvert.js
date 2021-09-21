export default (date) => {
  var lstDate = date.split("-");
  var MyDateString = '';
  if(lstDate.length === 3) {
     MyDateString = lstDate[2] + " / " + lstDate[1] + " / " + lstDate[0];
  }
  return MyDateString;
};
