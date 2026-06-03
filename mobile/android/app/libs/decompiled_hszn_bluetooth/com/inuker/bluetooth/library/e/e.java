/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e;

import com.inuker.bluetooth.library.e.c;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

public class e {
    public static byte[] a(String string) {
        MessageDigest messageDigest;
        try {
            messageDigest = MessageDigest.getInstance("MD5");
        }
        catch (NoSuchAlgorithmException noSuchAlgorithmException) {
            return null;
        }
        messageDigest.update(string.getBytes(), 0, string.length());
        byte[] byArray = messageDigest.digest();
        int n2 = byArray.length;
        if (n2 >= 12) {
            return Arrays.copyOfRange(byArray, n2 / 2 - 6, n2 / 2 + 6);
        }
        return c.a;
    }
}

