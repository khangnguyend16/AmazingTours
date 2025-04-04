const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false  // never show password
    },
    passwordConfirm: {  // only needed for validation
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This only works on CREATE and SAVE !!!
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not the same!'
        }
    },
    passwordChangedAt: {
        type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
})

userSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost 12
    this.password = await bcrypt.hash(this.password, 12); //Số 12 là cost factor (độ mạnh), càng cao thì càng an toàn nhưng cũng tốn CPU hơn.

    // delete passwordConfirm field in database
    this.passwordConfirm = undefined;
})

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000; // Sometimes saving to the database is a bit slower than issuing the JWT!!!
    // => the changed password timestamp is sometimes set a bit after the JWT creation => user unable to log in using the new token
    // => trick : Date.now() - 1 second !!!
    next();
})

userSchema.pre(/^find/, function (next) {
    //this points to the current query
    this.find({ active: { $ne: false } });
    next();
})

// Instance method: method available on all documents of certain collection
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        // console.log(changedTimestamp, JWTTimestamp);  // 1742428800 1742487536
        return JWTTimestamp < changedTimestamp;
    }

    // False means NOT changed
    return false;
}

userSchema.methods.createPasswordResetToken = function () {
    //Tạo một token ngẫu nhiên dài 32 byte, rồi chuyển nó thành một chuỗi hex (chuỗi chữ và số).
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256') // Băm (hash) token bằng thuật toán SHA-256, rồi lưu vào database
        .update(resetToken)
        .digest('hex');

    console.log({ resetToken }, this.passwordResetToken);

    //Thiết lập thời gian hết hạn cho token (10 phút).
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken; //Trả về token gốc (không phải token đã băm)
    // token gốc chỉ gửi cho user qua email, còn bản băm được lưu trong database.
}

const User = mongoose.model('User', userSchema);

module.exports = User;