const moment = require('moment');

const formatFrom = from => {
  return moment(new Date(from)).format('YYYY-MM-DD');
}

module.exports = {
  formatFrom,
}