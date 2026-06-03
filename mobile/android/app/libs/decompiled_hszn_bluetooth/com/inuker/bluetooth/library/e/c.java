/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e;

import java.util.Arrays;

public class c {
    public static final byte[] a = new byte[0];
    public static final int b = 255;

    public static byte[] a(byte[] byArray) {
        return byArray != null ? byArray : a;
    }

    public static String b(byte[] byArray) {
        StringBuilder stringBuilder = new StringBuilder();
        if (!c.d(byArray)) {
            for (int i2 = 0; i2 < byArray.length; ++i2) {
                stringBuilder.append(String.format("%02X", byArray[i2]));
            }
        }
        return stringBuilder.toString();
    }

    public static byte[] c(byte[] byArray) {
        int n2;
        for (n2 = byArray.length - 1; n2 >= 0 && byArray[n2] == 0; --n2) {
        }
        return Arrays.copyOfRange(byArray, 0, n2 + 1);
    }

    public static byte[] a(String string) {
        int n2 = string.length();
        byte[] byArray = new byte[(n2 + 1) / 2];
        for (int i2 = 0; i2 < n2; i2 += 2) {
            int n3 = Math.min(2, n2 - i2);
            String string2 = string.substring(i2, i2 + n3);
            byArray[i2 / 2] = (byte)Integer.parseInt(string2, 16);
        }
        return byArray;
    }

    public static boolean d(byte[] byArray) {
        return byArray == null || byArray.length == 0;
    }

    public static byte[] a(int n2) {
        byte[] byArray = new byte[4];
        for (int i2 = 0; i2 < 4; ++i2) {
            byArray[i2] = (byte)(n2 >>> i2 * 8);
        }
        return byArray;
    }

    public static boolean a(byte[] byArray, byte[] byArray2) {
        if (byArray == null && byArray2 == null) {
            return true;
        }
        if (byArray == null || byArray2 == null) {
            return false;
        }
        int n2 = byArray.length;
        int n3 = byArray2.length;
        if (n2 != n3) {
            return false;
        }
        for (int i2 = 0; i2 < n2; ++i2) {
            if (byArray[i2] == byArray2[i2]) continue;
            return false;
        }
        return true;
    }

    public static byte[] a(byte[] byArray, int n2, byte by) {
        int n3;
        byte[] byArray2 = byArray;
        int n4 = n3 = byArray != null ? byArray.length : 0;
        if (n3 < n2) {
            byArray2 = new byte[n2];
            int n5 = n2 - 1;
            int n6 = n3 - 1;
            while (n5 >= 0) {
                byArray2[n5] = n6 >= 0 ? byArray[n6] : by;
                --n5;
                --n6;
            }
        }
        return byArray2;
    }

    public static byte[] a(byte[] byArray, byte by) {
        if (c.d(byArray)) {
            return byArray;
        }
        for (int i2 = 0; i2 < byArray.length; ++i2) {
            if (byArray[i2] == by) continue;
            return Arrays.copyOfRange(byArray, i2, byArray.length);
        }
        return a;
    }

    public static byte[] b(byte[] byArray, byte by) {
        if (c.d(byArray)) {
            return byArray;
        }
        for (int i2 = byArray.length - 1; i2 >= 0; --i2) {
            if (byArray[i2] == by) continue;
            return Arrays.copyOfRange(byArray, 0, i2 + 1);
        }
        return a;
    }

    public static byte[] a(byte[] byArray, int n2, int n3) {
        if (byArray == null) {
            return null;
        }
        if (n2 < 0 || n2 >= byArray.length) {
            return null;
        }
        if (n3 < 0 || n3 >= byArray.length) {
            return null;
        }
        if (n2 > n3) {
            return null;
        }
        byte[] byArray2 = new byte[n3 - n2 + 1];
        for (int i2 = n2; i2 <= n3; ++i2) {
            byArray2[i2 - n2] = byArray[i2];
        }
        return byArray2;
    }

    public static int a(byte by) {
        return by & 0xFF;
    }

    public static boolean e(byte[] byArray) {
        int n2 = byArray != null ? byArray.length : 0;
        for (int i2 = 0; i2 < n2; ++i2) {
            if (c.a(byArray[i2]) == 255) continue;
            return false;
        }
        return true;
    }

    public static byte[] a(long l2) {
        byte[] byArray = new byte[8];
        for (int i2 = 0; i2 < 8; ++i2) {
            byArray[i2] = (byte)(l2 >>> i2 * 8);
        }
        return byArray;
    }

    public static void a(byte[] byArray, byte[] byArray2, int n2, int n3) {
        if (byArray != null && byArray2 != null && n2 >= 0) {
            int n4 = n2;
            for (int i2 = n3; i2 < byArray2.length && n4 < byArray.length; ++n4, ++i2) {
                byArray[n4] = byArray2[i2];
            }
        }
    }

    public static boolean b(byte[] byArray, byte[] byArray2) {
        return c.a(byArray, byArray2, Math.min(byArray.length, byArray2.length));
    }

    public static boolean a(byte[] byArray, byte[] byArray2, int n2) {
        if (byArray == byArray2) {
            return true;
        }
        if (byArray == null || byArray2 == null || byArray.length < n2 || byArray2.length < n2) {
            return false;
        }
        for (int i2 = 0; i2 < n2; ++i2) {
            if (byArray[i2] == byArray2[i2]) continue;
            return false;
        }
        return true;
    }

    public static byte[] a(byte[] byArray, int n2) {
        return c.b(byArray, n2, byArray.length - n2);
    }

    public static byte[] b(byte[] byArray, int n2, int n3) {
        byte[] byArray2 = new byte[n3];
        System.arraycopy(byArray, n2, byArray2, 0, n3);
        return byArray2;
    }

    public static byte[] a(short s) {
        return new byte[]{(byte)s, (byte)(s >>> 8)};
    }
}

