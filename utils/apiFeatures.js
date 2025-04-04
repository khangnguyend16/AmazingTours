class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        // 1A. Filtering
        const queryObj = { ...this.queryString }  // hard copy
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // 1B. Advanded Filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);  // regular expression => đặt dấu $ trước operators(gte,gt,lte,lt)

        console.log(JSON.parse(queryStr)) // { duration: { '$gte': '5' }, difficulty: 'easy', price: { '$lt': '1500' } }

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        // 2. Sortings
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join('');
            this.query = this.query.sort(sortBy);
            // sort('price ratingsAverage')
        } else {
            this.query = this.query.sort('-createdAt');  // default
        }
        return this;
    }

    limitFields() {
        // 3. Field Limiting
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(']');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v'); // default: excluding "__v"
        }
        return this;
    }

    paginate() {
        // 4. Pagination
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        // page=3&limit=10 (1-10 page 1, 11-20 page 2, 21-30 page 3...)
        this.query = this.query.skip(skip).limit(limit)

        return this;
    }
}
module.exports = APIFeatures;