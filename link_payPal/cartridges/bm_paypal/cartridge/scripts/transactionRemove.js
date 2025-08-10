

const CustomObjectMgr = require('dw/object/CustomObjectMgr');

/**
 * Remove custom transction that more than year old
 */
function execute() {
    var year = 31556952000;
    var { queryCustomObjects, remove } = CustomObjectMgr;
    var dueDate = new Date((new Date()).getTime() - year);
    var transactionToRemove = queryCustomObjects('PayPalNewTransactions', 'creationDate < {0}', 'creationDate desc', dueDate);
    while (transactionToRemove.hasNext()) {
        remove(transactionToRemove.next());
    }
}

exports.execute = execute;
