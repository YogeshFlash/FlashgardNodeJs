/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.cc;

import java.security.Key;
import java.util.ArrayList;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.DESKeySpec;
import javax.crypto.spec.IvParameterSpec;

public class Arrays {
    public static byte[] Arrlist2Arr(ArrayList<Integer> arrayList) {
        byte[] byArray = new byte[arrayList.size()];
        for (int i2 = 0; i2 < arrayList.size(); ++i2) {
            byArray[i2] = arrayList.get(i2).byteValue();
        }
        return byArray;
    }

    public static int[] convertNumber2(int n2) {
        String string = String.format("%08x", n2);
        int[] nArray = new int[4];
        nArray[3] = Integer.parseInt(string.substring(0, 2), 16);
        nArray[2] = Integer.parseInt(string.substring(2, 4), 16);
        nArray[1] = Integer.parseInt(string.substring(4, 6), 16);
        nArray[0] = Integer.parseInt(string.substring(6, 8), 16);
        return nArray;
    }

    public static ArrayList<Integer> ConvertString(String string, int n2) {
        ArrayList<Integer> arrayList = new ArrayList<Integer>();
        char[] cArray = string.toCharArray();
        for (int i2 = 0; i2 < n2; ++i2) {
            if (cArray.length > i2) {
                arrayList.add(Integer.valueOf(cArray[i2]));
                continue;
            }
            arrayList.add(0);
        }
        return arrayList;
    }

    public static String stringByAsciiByte(byte[] byArray) {
        StringBuffer stringBuffer = new StringBuffer();
        char[] cArray = new char[byArray.length];
        for (int i2 = 0; i2 < byArray.length; ++i2) {
            cArray[i2] = (char)byArray[i2];
        }
        stringBuffer.append(cArray);
        return stringBuffer.toString();
    }

    public static String decrypt(String string, String string2) throws Exception {
        byte[] byArray = Arrays.convertHexString(string);
        Cipher cipher = Cipher.getInstance("DES/CBC/PKCS5Padding");
        DESKeySpec dESKeySpec = new DESKeySpec(string2.getBytes("UTF-8"));
        SecretKeyFactory secretKeyFactory = SecretKeyFactory.getInstance("DES");
        SecretKey secretKey = secretKeyFactory.generateSecret(dESKeySpec);
        IvParameterSpec ivParameterSpec = new IvParameterSpec(string2.getBytes("UTF-8"));
        cipher.init(2, (Key)secretKey, ivParameterSpec);
        byte[] byArray2 = cipher.doFinal(byArray);
        return new String(byArray2);
    }

    public static byte[] convertHexString(String string) {
        byte[] byArray = new byte[string.length() / 2];
        for (int i2 = 0; i2 < byArray.length; ++i2) {
            String string2 = string.substring(2 * i2, 2 * i2 + 2);
            int n2 = Integer.parseInt(string2, 16);
            byArray[i2] = (byte)n2;
        }
        return byArray;
    }

    public static List<String> cutStrList(String string, int n2) {
        int n3 = string.length() / n2;
        if (string.length() % n2 != 0) {
            ++n3;
        }
        return Arrays.getStrList(string, n2, n3);
    }

    public static List<String> getStrList(String string, int n2, int n3) {
        ArrayList<String> arrayList = new ArrayList<String>();
        for (int i2 = 0; i2 < n3; ++i2) {
            String string2 = Arrays.substring(string, i2 * n2, (i2 + 1) * n2);
            arrayList.add(string2);
        }
        return arrayList;
    }

    public static String substring(String string, int n2, int n3) {
        if (n2 > string.length()) {
            return null;
        }
        if (n3 > string.length()) {
            return string.substring(n2, string.length());
        }
        return string.substring(n2, n3);
    }

    public static String byteArrayToHexStr(byte[] byArray) {
        if (byArray == null) {
            return null;
        }
        char[] cArray = "0123456789ABCDEF".toCharArray();
        char[] cArray2 = new char[byArray.length * 2];
        for (int i2 = 0; i2 < byArray.length; ++i2) {
            int n2 = byArray[i2] & 0xFF;
            cArray2[i2 * 2] = cArray[n2 >>> 4];
            cArray2[i2 * 2 + 1] = cArray[n2 & 0xF];
        }
        return new String(cArray2);
    }

    public static byte[] hexStrToByteArray(String string) {
        if (string == null) {
            return null;
        }
        if (string.length() == 0) {
            return new byte[0];
        }
        byte[] byArray = new byte[string.length() / 2];
        for (int i2 = 0; i2 < byArray.length; ++i2) {
            String string2 = string.substring(2 * i2, 2 * i2 + 2);
            byArray[i2] = (byte)Integer.parseInt(string2, 16);
        }
        return byArray;
    }
}

