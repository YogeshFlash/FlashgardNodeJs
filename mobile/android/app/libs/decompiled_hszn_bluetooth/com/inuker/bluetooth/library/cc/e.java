/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.cc;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class e {
    public static byte[] a(byte[] byArray) {
        MessageDigest messageDigest = null;
        try {
            messageDigest = MessageDigest.getInstance("SHA-256");
        }
        catch (NoSuchAlgorithmException noSuchAlgorithmException) {
            noSuchAlgorithmException.printStackTrace();
        }
        messageDigest.reset();
        return messageDigest.digest(byArray);
    }
}

